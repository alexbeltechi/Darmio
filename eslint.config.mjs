import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * The paved paths in docs/conventions.md, enforced. Each message names the
 * one way to do it, so an agent that trips a rule knows where to go.
 * `npm run verify` fails on any warning, so warnings are errors in practice.
 */

// Tailwind's raw palette (`bg-zinc-100`, `text-emerald-600`…). Parabola tokens
// (`bg-ds-surface`, `text-ds-fg-muted`, `bg-ds-accent-red`) replace them.
const RAW_PALETTE =
  "/(^|[\\s:\"'`])(bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)\\b/";
const RAW_PALETTE_MESSAGE =
  "Raw Tailwind colour: use a Parabola token instead (bg-ds-*, text-ds-*, border-ds-*, or an accent: bg-ds-accent-*).";

// shadcn's colour names (`bg-muted`, `text-muted-foreground`…). They no longer
// resolve to anything; Parabola tokens replaced them.
const SHADCN_COLOUR =
  "/(^|[\\s:\"'`])(bg|text|border|ring|outline|fill|stroke|divide|placeholder)-(muted|muted-foreground|foreground|background|primary|primary-foreground|secondary|secondary-foreground|accent|accent-foreground|destructive|popover|popover-foreground|card|card-foreground|input|border|ring)(?![\\w-])/";
const SHADCN_COLOUR_MESSAGE = "shadcn colour name: use a Parabola token (bg-ds-*, text-ds-*, border-ds-*).";

const APP_IMPORTS = [
  {
    group: ["@beltechi/parabola/showcase/*"],
    message: "The showcase is the /parabola site's own code, not part of the design system.",
  },
  {
    group: ["@radix-ui/*"],
    message: "Use a Parabola primitive (DsDialog, DsSidePanel, DsDropdown…). If none fits, add one in packages/parabola on top of Radix.",
  },
];
const APP_PATHS = [
  { name: "sonner", message: "Use dsToast from @beltechi/parabola." },
  { name: "uuid", message: "Use crypto.randomUUID()." },
  { name: "nanoid", message: "Use crypto.randomUUID()." },
  { name: "mongodb", message: "Database access lives in src/lib/db; import a function from there." },
];

const APP_SYNTAX = [
  { selector: `Literal[value=${RAW_PALETTE}]`, message: RAW_PALETTE_MESSAGE },
  { selector: `TemplateElement[value.raw=${RAW_PALETTE}]`, message: RAW_PALETTE_MESSAGE },
  { selector: `Literal[value=${SHADCN_COLOUR}]`, message: SHADCN_COLOUR_MESSAGE },
  { selector: `TemplateElement[value.raw=${SHADCN_COLOUR}]`, message: SHADCN_COLOUR_MESSAGE },
  {
    selector: ":matches(FunctionDeclaration, VariableDeclarator)[id.name='slugify']",
    message: "There is one slugify: import it from @/lib/slug.",
  },
  {
    selector: "ObjectPattern > Property[key.name='_id']",
    message: "Strip Mongo's _id with withoutId() from @/lib/db/mongodb.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // `const { passwordHash, ...safe } = user` is how a field is left out.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // CMS media is served as made at upload, never through next/image's
      // resizer (decisions, 2026-10-08), so <img> and MediaImage are the way.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/parabola/**"],
    rules: {
      "no-alert": "error",
      "no-restricted-imports": ["error", { paths: APP_PATHS, patterns: APP_IMPORTS }],
      "no-restricted-syntax": ["error", ...APP_SYNTAX],
    },
  },
  {
    // Admin routes are guarded by src/middleware.ts, for signed-in users and
    // agent tokens alike; a route's own session check would lock agents out.
    // (Site preview pages sit outside the middleware and do check.)
    files: ["src/app/api/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...APP_PATHS,
            {
              name: "next-auth",
              importNames: ["getServerSession"],
              message: "src/middleware.ts already guards /api/admin; routes don't check auth themselves.",
            },
          ],
          patterns: APP_IMPORTS,
        },
      ],
    },
  },
  {
    // The two places allowed to do what the rules above forbid.
    files: ["src/lib/db/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { paths: APP_PATHS.filter((p) => p.name !== "mongodb"), patterns: APP_IMPORTS }] },
  },
  {
    files: ["src/lib/db/mongodb.ts", "src/lib/slug.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Known debt, to be paved over, not copied. Remove a file once it's fixed;
    // never add one. See docs/roadmap.md, "Gardening".
    files: [
      "src/components/admin/media-detail-modal.tsx", // raw Radix Dialog → a Parabola modal
      "src/components/admin/media-picker.tsx", // raw Radix Dialog → a Parabola modal
      "src/components/admin/gallery-block-editor.tsx", // raw Radix Popover → a Parabola popover
    ],
    rules: { "no-restricted-imports": ["error", { paths: APP_PATHS }] },
  },
  {
    // Parabola is its own package (packages/parabola, published to npm): nothing from the app.
    files: ["packages/parabola/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*"],
              message: "Parabola is self-contained: import from inside packages/parabola or a package, never the app.",
            },
          ],
        },
      ],
    },
  },
  // Other sessions' worktrees are whole checkouts (with their own .next) and lint themselves.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".backups/**", ".claude/worktrees/**"]),
]);

export default eslintConfig;
