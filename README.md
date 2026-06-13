# hcm-consent

Convert markdown strings into React elements, styled with the company
**Tailwind CSS** typography theme. Built on
[`markdown-to-jsx`](https://github.com/quantizor/markdown-to-jsx) +
[`@tailwindcss/typography`](https://github.com/tailwindlabs/tailwindcss-typography).

> **ESM only.** No CommonJS build is shipped — consumers must use `import`.

## Install

```sh
npm install hcm-consent
npm install react react-dom   # peer deps
```

## Usage

Import the component **and the stylesheet once** in your app:

```tsx
import { Markdown } from 'hcm-consent';
import 'hcm-consent/styles.css'; // once, anywhere in your app

<Markdown content="# Hello **world**" />
```

Three entry points:

```tsx
import { Markdown, useMarkdown, mdToReactElement } from 'hcm-consent';

<Markdown content="# Title" />                 // component
const el = useMarkdown('## Title\n\nbody');     // hook (memoized element)
const el2 = mdToReactElement('- a\n- b');       // plain util
```

Tune styling with Tailwind `prose-*` modifiers via `className`, override one
element via `options.overrides` (markdown-to-jsx), or drop the company theme
with `brand={false}`:

```tsx
<Markdown content={md} className="prose-lg prose-img:rounded-xl" />
<Markdown content={md} options={{ overrides: { a: (p) => <MyLink {...p} /> } }} />
<Markdown content={md} brand={false} className="my-own-classes" />
```

## Styling model

Styling uses the Tailwind Typography plugin: the wrapper gets `prose` plus brand
element modifiers (`prose-headings:text-brand-heading`, `prose-a:text-brand-link`, ...).
Those modifiers resolve to **four brand tokens** — the package's theming contract:

| Token                   | Used by                              | Meaning              |
| ----------------------- | ------------------------------------ | -------------------- |
| `--color-brand-heading` | `prose-headings:text-brand-heading`  | Heading color        |
| `--color-brand-link`    | `prose-a:text-brand-link`            | Link color           |
| `--color-brand-code`    | `prose-code:text-brand-code`         | Inline code color    |
| `--color-brand-quote`   | `prose-blockquote:border-brand-quote`| Blockquote border    |

The **names are stable**; the values are supplied by whoever builds the final CSS.

### Recommended: let your shared Tailwind theme supply the tokens

When every consumer shares one company UI library + Tailwind v4 config, **don't**
import the pre-compiled `styles.css`. Instead, map the four brand tokens to your
design tokens in your shared `@theme`, and let your build scan this package so it
generates the prose utilities from **your** theme:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@source "../node_modules/hcm-consent/dist/**/*.js";

/* 👇 paste into your shared @theme and fill in the TODOs */
@theme {
  --color-brand-heading: var(--TODO-company-heading);  /* TODO: 公司標題色 */
  --color-brand-link:    var(--TODO-company-link);     /* TODO: 公司連結色 */
  --color-brand-code:    var(--TODO-company-code);     /* TODO: 公司行內 code 色 */
  --color-brand-quote:   var(--TODO-company-quote);    /* TODO: 公司引言邊框色 */
}
```

(Tailwind ignores `node_modules` unless an explicit `@source` points at it.)
Mapping the tokens **once** in the shared theme keeps this package theme-neutral
and portable — no company colors are hard-coded into it.

### Fallback: the self-contained pre-compiled `dist/styles.css`

For standalone use (no shared Tailwind build), import the shipped stylesheet. It
uses the placeholder brand values in `src/styles/markdown.css` under `@theme`:

- Works whether or not the consuming app uses Tailwind.
- **Excludes Tailwind Preflight**, so importing it will not reset your app's global styles.
- Emits only the prose rules + the few utilities the components use.

## Scripts

| Script              | What it does                                                    |
| ------------------- | -------------------------------------------------------------- |
| `npm run typecheck`  | Type-check with **tsgo** (`@typescript/native-preview`)       |
| `npm run build`      | `build:js` + `build:types` + `build:css`                      |
| `npm run build:js`   | ESM build, one file per module (`preserveModules`)            |
| `npm run build:types`| Emit the `.d.ts` tree with `tsc`                              |
| `npm run build:css`  | Compile `dist/styles.css` with the Tailwind v4 CLI            |
| `npm test`          | Run vitest once                                                |
| `npm run release`   | Bump version + regenerate `CHANGELOG.md` from commits + tag    |

## Why typecheck and `.d.ts` use different compilers

`npm run typecheck` runs **tsgo** (fast, Go-based). `.d.ts` generation runs the
regular `typescript` compiler (`tsc`, via `build:types`) — tsgo does not yet
expose a stable declaration emit. So both are installed: tsgo for fast checks,
`typescript` for reliable declarations.

## Client / server boundaries

The package ships one import path. Each source file becomes its own ESM file
(`preserveModules`) and keeps its own `'use client'` directive, so a single
entry can expose both:

- **server-safe** (callable in an RSC): `normalizeConsent`, `extractTitle`,
  `mdToReactElement`, types/consts.
- **client**: `Markdown`, `ConsentRenderer` carry `'use client'` (markdown-to-jsx
  uses hooks); `useConsent` / `useMarkdown` are React hooks, so client-only too.

## Commits & releases

Commits follow [Conventional Commits](https://www.conventionalcommits.org/); a
husky `commit-msg` hook runs `commitlint`.

```
feat: add table styling
fix: correct brand link color
```

`npm run release` (`commit-and-tag-version`) reads those commits, bumps the
version, writes/updates `CHANGELOG.md`, commits and tags. Then
`npm publish --access public` and `git push --follow-tags`.
