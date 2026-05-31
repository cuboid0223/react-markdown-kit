# @your-org/react-markdown-kit

Convert markdown strings into React elements, styled with the company
**Tailwind CSS** typography theme. Built on
[`react-markdown`](https://github.com/remarkjs/react-markdown) +
[`@tailwindcss/typography`](https://github.com/tailwindlabs/tailwindcss-typography).

> **ESM only.** No CommonJS build is shipped — consumers must use `import`.

## Install

```sh
npm install @your-org/react-markdown-kit
npm install react react-dom   # peer deps
```

## Usage

Import the component **and the stylesheet once** in your app:

```tsx
import { Markdown } from '@your-org/react-markdown-kit';
import '@your-org/react-markdown-kit/styles.css'; // once, anywhere in your app

<Markdown content="# Hello **world**" />
```

Three entry points:

```tsx
import { Markdown, useMarkdown, mdToReactElement } from '@your-org/react-markdown-kit';

<Markdown content="# Title" />                 // component
const el = useMarkdown('## Title\n\nbody');     // hook (memoized element)
const el2 = mdToReactElement('- a\n- b');       // plain util
```

Tune styling with Tailwind `prose-*` modifiers via `className`, override one
element via `components`, or drop the company theme with `brand={false}`:

```tsx
<Markdown content={md} className="prose-lg prose-img:rounded-xl" />
<Markdown content={md} components={{ a: (p) => <MyLink {...p} /> }} />
<Markdown content={md} brand={false} className="my-own-classes" />
```

## Styling model

Styling uses the Tailwind Typography plugin: the wrapper gets `prose` plus brand
element modifiers (`prose-headings:text-brand-heading`, `prose-a:text-brand-link`, ...).
Brand colors are defined **once** in `src/styles/markdown.css` under `@theme`
(`--color-brand-*`) — edit them there.

This package ships a **self-contained, pre-compiled** `dist/styles.css`:

- Works whether or not the consuming app uses Tailwind.
- **Excludes Tailwind Preflight**, so importing it will not reset your app's global styles.
- Emits only the prose rules + the few utilities the components use.

### Alternative: let the consumer's Tailwind generate the classes

If every consumer is on **Tailwind v4** and you'd rather the markdown inherit the
consuming app's own theme, skip importing `styles.css` and add this to the app's
Tailwind entry CSS so its build scans this package:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@source "../node_modules/@your-org/react-markdown-kit/dist/**/*.js";
```

(Tailwind ignores `node_modules` unless an explicit `@source` points at it.)

## Scripts

| Script              | What it does                                                    |
| ------------------- | -------------------------------------------------------------- |
| `npm run typecheck` | Type-check with **tsgo** (`@typescript/native-preview`)        |
| `npm run build`     | `build:js` + `build:css`                                       |
| `npm run build:js`  | ESM bundle + rolled-up `dist/index.d.ts` via `vite-plugin-dts` |
| `npm run build:css` | Compile `dist/styles.css` with the Tailwind v4 CLI             |
| `npm test`          | Run vitest once                                                |
| `npm run release`   | Bump version + regenerate `CHANGELOG.md` from commits + tag    |

## Why typecheck and `.d.ts` use different compilers

`npm run typecheck` runs **tsgo** (fast, Go-based). `.d.ts` generation still goes
through `vite-plugin-dts`, which needs the regular `typescript` package — tsgo
does not yet expose a stable compiler API for that, and its declaration emit is
still in-progress. So both are installed: tsgo for fast checks, `typescript` for
reliable declarations.

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
