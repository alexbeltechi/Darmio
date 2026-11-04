import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { dsCustomFont, dsCustomFontFromInput, dsGoogleWeights } from "../../../packages/parabola/fonts";
import { DS_ACCENT_COLOURS, DS_BASE_COLOURS } from "../../../packages/parabola/colours";
import { DS_DEFAULT_THEME, dsThemeCss, parseDsThemeConfig } from "../../../packages/parabola/theme";
import { dsThemeFileName, dsThemeFileParse, dsThemeFileText } from "../../../packages/parabola/theme-file";

const file = (theme: unknown, extra: Record<string, unknown> = {}) => ({
  format: "darmio-theme",
  version: 1,
  name: "Invented",
  theme,
  ...extra,
});

describe("theme file", () => {
  it("parses the example theme", () => {
    const text = readFileSync("examples/example.theme.json", "utf8");
    const result = dsThemeFileParse(text);
    assert.ok(result.ok, result.ok ? "" : result.errors.join("\n"));
    assert.equal(result.theme.colours.theme.light, "#F6F0E6");
    assert.equal(result.theme.type.h1.size, 44);
    assert.equal(result.theme.radius, "small");
    // What the file leaves out stays Parabola's.
    assert.equal(result.theme.type.p.size, DS_DEFAULT_THEME.type.p.size);
  });

  it("round-trips: theme to file to theme", () => {
    const first = dsThemeFileParse(readFileSync("examples/example.theme.json", "utf8"));
    assert.ok(first.ok);
    const text = dsThemeFileText(first.theme, first.name, first.description);
    const second = dsThemeFileParse(text);
    assert.ok(second.ok, second.ok ? "" : second.errors.join("\n"));
    assert.deepEqual(second.theme, first.theme);
    assert.equal(dsThemeFileText(second.theme, second.name, second.description), text);
  });

  it("round-trips Parabola's own theme", () => {
    const result = dsThemeFileParse(dsThemeFileText(DS_DEFAULT_THEME, "Parabola"));
    assert.ok(result.ok, result.ok ? "" : result.errors.join("\n"));
    assert.deepEqual(result.theme, DS_DEFAULT_THEME);
  });

  it("accepts an empty theme as Parabola's defaults", () => {
    const result = dsThemeFileParse(file({}));
    assert.ok(result.ok);
    assert.deepEqual(result.theme, DS_DEFAULT_THEME);
  });

  it("names every mistake, with the allowed values", () => {
    const result = dsThemeFileParse(
      file({ colours: { theme: { light: "red" } }, sparkle: true, radius: "huge", icons: "tabler", customFonts: [{ id: "x", label: "X", google: "https://evil.example/a.css" }] })
    );
    assert.ok(!result.ok);
    const text = result.errors.join("\n");
    assert.match(text, /unknown key "sparkle"/);
    assert.match(text, /theme\.colours\.theme\.light/);
    assert.match(text, /theme\.radius.*"none", "small", "medium", "large"/);
    assert.match(text, /theme\.icons/);
    assert.match(text, /No links/);
  });

  it("rejects bad files", () => {
    assert.ok(!dsThemeFileParse("not json").ok);
    assert.ok(!dsThemeFileParse([]).ok);
    assert.ok(!dsThemeFileParse({ ...file({}), format: "other" }).ok);
    assert.ok(!dsThemeFileParse({ ...file({}), version: 2 }).ok);
    assert.ok(!dsThemeFileParse(file({ type: { h1: { size: 4 } } })).ok);
  });

  it("names the file from the theme's name", () => {
    assert.equal(dsThemeFileName("Warm Paper!"), "warm-paper.theme.json");
  });
  it("refuses a custom font name that could break out of the CSS", () => {
    for (const label of ["</style><script>alert(1)</script>", 'a"; } body { display:none', "x\\", "a{b}"]) {
      const result = dsThemeFileParse(file({ customFonts: [{ id: "bad", label, google: "Fraunces" }] }));
      assert.equal(result.ok, false, label);
    }
    assert.ok(dsThemeFileParse(file({ customFonts: [{ id: "ok", label: "Fraunces 72pt-O'Neil_x.1", google: "Fraunces" }] })).ok);
    assert.ok(dsThemeFileParse(file({ customFonts: [{ id: "ok", label: "Zeichen Über", google: "Fraunces" }] })).ok);
  });

  it("keeps stored data safe too: the font stack and the theme CSS carry no markup", () => {
    const evil = "</style><script>alert(1)</script>";
    assert.ok(!dsCustomFont({ id: "x", label: evil, google: "Fraunces" }).family.includes("<"));
    const stored = parseDsThemeConfig({
      customFonts: [
        { id: "x", label: evil, google: "Fraunces" },
        { id: "y", label: "Fine", google: 'A"><script>' },
        { id: 'z"]', label: "Fine", google: "Fraunces" },
      ],
      families: [{ id: "body", label: "Font", font: "x" }],
    });
    assert.deepEqual(stored.customFonts.map((f) => f.id), ["x"]);
    assert.ok(!dsThemeCss(stored).includes("<"));
  });

  it("keeps a partial file's colours", () => {
    const result = dsThemeFileParse(file({ colours: { accent: { light: "#FF0000" }, surface: { light: "#112233" } } }));
    assert.ok(result.ok);
    assert.equal(result.theme.colours.accent.light, "#FF0000");
    assert.equal(result.theme.colours.surface.light, "#112233");
    const only = dsThemeFileParse(file({ colours: { accent: { light: "#00FF00" } } }));
    assert.ok(only.ok);
    assert.equal(only.theme.colours.accent.light, "#00FF00");
  });
  it("reads a character with colour and brightness as the current dials", () => {
    const result = dsThemeFileParse(file({ character: { hue: 120, colour: 1, brightness: 0.5 } }));
    assert.ok(result.ok);
    assert.equal(result.theme.character.brightness, 0.5);
    assert.equal(result.theme.character.colour, 1);
    assert.equal(result.theme.character.hue, 120);
  });

  it("exports a stored preset colour as the preset, and reads it back", () => {
    const stored = parseDsThemeConfig({ colours: { accent: { light: "blue" }, text: { light: "stone" } } });
    assert.equal(stored.colours.accent.light, "blue");
    const back = dsThemeFileParse(dsThemeFileText(stored, "Preset"));
    assert.ok(back.ok, back.ok ? "" : back.errors.join("\n"));
    assert.equal(back.theme.colours.accent.light, "blue");
  });
  it("bounds the weights a custom font asks for, and never loops on stored data", () => {
    const huge = "H:wght@100000000000000000000..100000000000000000000";
    assert.equal(dsThemeFileParse(file({ customFonts: [{ id: "h", label: "H", google: huge }] })).ok, false);
    assert.equal(dsThemeFileParse(file({ customFonts: [{ id: "h", label: "H", google: "H:wght@0..2000" }] })).ok, false);
    assert.ok(dsThemeFileParse(file({ customFonts: [{ id: "h", label: "H", google: "H:ital,wght@0,100..900;1,400" }] })).ok);
    // Stored data from any path: returns, with weights inside 1 to 1000.
    assert.deepEqual(dsGoogleWeights(huge), [1000]);
    const w = dsGoogleWeights("H:wght@1..99999999999");
    assert.ok(w.length <= 12 && w.every((n) => n >= 1 && n <= 1000));
    assert.equal(parseDsThemeConfig({ customFonts: [{ id: "h", label: "H", google: huge }] }).customFonts.length, 0);
  });

  it("reads the ids the builder makes, digits first included", () => {
    const font = dsCustomFontFromInput("42dot Sans");
    assert.ok(font);
    assert.equal(font.id, "42dot-sans");
    assert.ok(dsThemeFileParse(file({ customFonts: [font], families: [{ id: "body", label: "Font", font: font.id }] })).ok);
  });

  it("exports a text preset so the rendered text stays", () => {
    const stored = parseDsThemeConfig({ colours: { text: { light: "slate" } } });
    const back = dsThemeFileParse(dsThemeFileText(stored, "Slate"));
    assert.ok(back.ok, back.ok ? "" : back.errors.join("\n"));
    const vars = (css: string, name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
    const before = dsThemeCss(stored);
    const after = dsThemeCss(back.theme);
    for (const name of ["--ds-fg", "--ds-fg-muted"]) assert.equal(vars(after, name), vars(before, name), name);
  });

  it("cuts a long name on export so the file reads back", () => {
    const back = dsThemeFileParse(dsThemeFileText(DS_DEFAULT_THEME, "N".repeat(90)));
    assert.ok(back.ok);
  });

  it("keeps the whole rendering (light and dark) for every accent and text preset", () => {
    const cases = [
      ...DS_ACCENT_COLOURS.map((c) => ({ colours: { accent: { light: c.id } } })),
      ...DS_BASE_COLOURS.map((c) => ({ colours: { text: { light: c.id } } })),
    ];
    for (const raw of cases) {
      const stored = parseDsThemeConfig(raw);
      const back = dsThemeFileParse(dsThemeFileText(stored, "Preset"));
      assert.ok(back.ok, back.ok ? "" : back.errors.join("\n"));
      assert.equal(dsThemeCss(back.theme), dsThemeCss(stored), JSON.stringify(raw));
    }
  });
});
