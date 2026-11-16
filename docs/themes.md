# Make your own theme

A theme changes how your whole site looks: colours, fonts, text sizes, corners, buttons.
It is one file, `something.theme.json`. You (or your agent) write it, add it in
**Settings › Design**, and remove it there again. No code is touched, and the admin
keeps Parabola's own look so a theme can never make it hard to use.

## Add it, switch it, remove it

- **Settings › Design › Add a theme file** reads the file. If something is wrong, you get a
  message naming each mistake and the values that are allowed. Nothing is saved until the file is valid.
- A theme you add goes on your site at once. Pick another in the **Theme** list, or pick
  Parabola to go back.
- **Remove this theme** deletes it from your site. If your site was wearing it, it goes back to
  Parabola's own look. **Save this theme as a file** gives you the file back.
- Agents use `POST /api/admin/themes` with `{"file": {...}}` and `DELETE /api/admin/themes?id=…`
  (listed in `GET /api/admin/agent`).

## The file

```json
{
  "format": "parabola-theme",
  "version": 1,
  "name": "Warm paper",
  "description": "Optional. Up to 300 characters.",
  "theme": { }
}
```

`format` and `version` are exactly as shown. `name` is 1 to 60 characters. `theme` may be empty:
whatever you leave out stays Parabola's. A full working file is
[`examples/example.theme.json`](../examples/example.theme.json).

Only the keys below are allowed; any other key is an error, so a typo is caught rather than ignored.

### `colours`

Keys: `theme` (the page background), `surface` (cards), `text`, `muted`, `accent` (buttons and
highlights), `buttonSecondary`, `field` (inputs). Each is `{ "light": "#RRGGBB" | null, "dark": "#RRGGBB" | null }`.
`null` (or leaving it out) means Auto: worked out from the other colours and the `character`.
`lightShift` and `darkShift` (-0.5 to 0.5) nudge an Auto colour.

### `families` and `type`

`families` is a list of `{ "id", "label", "font" }`. `body` (the text) and `heading` are the two
every theme has. `font` is one of Parabola's: `instrument-sans`, `instrument-serif`, `system`, and the rest
in `DS_FONTS` (`packages/parabola/fonts.ts`), or a font added in `customFonts`.

`customFonts` is a list of `{ "id", "label", "google" }`: a Google font by name and weights, like
`"Fraunces:wght@400;700"`. Never a link.

`type` sets any of `display`, `h1`, `h2`, `h3`, `p`, `prose`, `small`, each with `label`, `family`
(one of the theme's family ids), `weight` (100 to 900), `size` (10 to 200) and `lineHeight` (10 to 240), in pixels.

### Corners, buttons, fields, icons

- `radius`, `pillRadius`: `"none"`, `"small"`, `"medium"`, `"large"`, pixels (0 to 64), or `null` for Auto.
- `buttons`: `null` for Auto, or `fill` (`"solid"`, `"gradient"`, `"none"`), `contrast` (-1 to 1), `outline`,
  `outlineWidth` (1 to 8), `outlineOpacity` (0 to 1), `shadow`, `shadowAngle` (0 to 360).
- `fields`: `outline`, `outlineWidth`, `outlineOpacity`.
- `icons`: `"lucide"` (the only library ready).

### `character`

The dials a whole look is worked out from; an agent can move these instead of picking colours:
`hue` (0 to 360), `warmth` (-1 to 1), `colour` (0 to 1), `brightness` (0 to 1), `contrast` (-1 to 1),
`ink` (0 to 1), `roundness` (0 to 1), `depth` (0 to 1), `mood` (0 to 1), plus `tastes` and `scoped`
(the style picks the builder makes). Colours you set yourself win over the dials.

## Make one with an agent

Tell your agent: "Read `docs/themes.md` and `examples/example.theme.json`, then write
`<name>.theme.json` for a site that feels like …, and add it with `POST /api/admin/themes`."
It can also design in the builder at `/parabola/theme` and use **Save this theme as a file**.

## For developers

The contract is code: `packages/parabola/theme-file.ts` (`DS_THEME_FILE_CONTRACT`,
`dsThemeFileParse`, `dsThemeToFile`). `src/lib/cms/theme-file.test.ts` checks that the example parses and that a
theme survives file → theme → file unchanged.
