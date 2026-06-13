# hcm-consent

Render a backend consent document — markdown body + its checkboxes — as React,
with `required`-checkbox gating. Part of `hcm-consent`, built on
`markdown-to-jsx`.

The feature is split into a **pure core** (RSC-safe, no React runtime) and a
**client surface** (`'use client'`). You can fetch + normalize on the server and
hand the result to the client, or let the client fetch a same-origin endpoint
itself.

---

## Install & import

```ts
// Pure core — safe in a React Server Component:
import {
  normalizeConsent,
  ConsentNormalizeError,
  extractTitle,
  CONSENT_STATUSES,
  DEFAULT_CONSENT_STATUS,
  DEFAULT_CONSENT_TITLE,
  type ConsentData,
  type ConsentCheckbox,
  type ConsentStatus,
  type ConsentFetchOptions,
  type NormalizeConsentOptions,
} from 'hcm-consent';

// Client surface — components/hooks (each carries its own 'use client'):
import {
  ConsentRenderer,
  useConsent,
  type ConsentRendererProps,
  type ConsentCheckboxComponent,
  type ConsentCheckboxComponentProps,
  type ConsentCheckedState,
  type UseConsentOptions,
  type UseConsentResult,
  type ConsentCheckboxState,
} from 'hcm-consent';
```

Styling needs to be wired **once** in your app. Two paths (see the
[Styling model](../README.md#styling-model) in the README for details):

- **Recommended (shared company theme):** don't import the stylesheet. Map the
  four brand tokens in your shared Tailwind v4 `@theme` and add
  `@source "../node_modules/hcm-consent/dist/**/*.js";` so your build generates
  the prose utilities from your own theme.
- **Fallback (standalone):** import the pre-compiled stylesheet once, anywhere
  in your app — it uses placeholder brand colors.

  ```ts
  import 'hcm-consent/styles.css';
  ```

---

## Data model

Every loading path produces one canonical, JSON-serializable shape — so it can
cross an RSC → client boundary unchanged.

### `ConsentData`

| Field             | Type               | Notes                                                          |
| ----------------- | ------------------ | -------------------------------------------------------------- |
| `title`           | `string`           | Display title; falls back to the body's first H1.              |
| `contentMarkdown` | `string`           | Markdown body, with the title H1 and checkbox items extracted out. |
| `checkboxes`      | `ConsentCheckbox[]`| Parsed from task-list items (`- [ ]` / `- [x]`).               |
| `status`          | `ConsentStatus`    | Overall lifecycle status (from the backend's numeric `status`).|
| `locale?`         | `string`           | The locale segment this data was resolved from, when known.    |
| `version?`        | `string`           | Document version. This is the consent **identity** — a decision is recorded against a `version`, not a locale; submit it when recording consent. |

### `ConsentCheckbox`

| Field             | Type      | Notes                                                  |
| ----------------- | --------- | ------------------------------------------------------ |
| `id`              | `string`  | Stable id, unique within a `ConsentData` (`cb-0`, …). Positional. |
| `label`           | `string`  | Label **inline-markdown** source (links / bold / em); rendered, not shown literally. |
| `required`        | `boolean` | Always `true` — every consent box must be ticked. Optional/marketing opt-ins are out of scope for this component. |
| `defaultChecked?` | `boolean` | Initial state, from the `[x]` marker. Default `false`. |

### `ConsentStatus`

`'pending' | 'consented' | 'expired'` — mapped from the backend numeric code:
`0 → pending`, `1 → consented`, `2 → expired`; any other/missing value →
`DEFAULT_CONSENT_STATUS` (`'pending'`).

---

## `normalizeConsent(raw, options?)`

Turn a raw backend payload into a validated `ConsentData`. Pure and React-free —
call it directly inside an RSC after fetching.

```ts
function normalizeConsent(
  raw: unknown,
  options?: { locale?: string; knownLocales?: string[] },
): ConsentData;
```

> **`knownLocales`** — pass the locale codes your backend actually emits (e.g.
> `['en', 'zh-TW']`). Only a line matching one of them counts as a segment
> boundary, so an ordinary one-word body line (`ok`, `yes`, …) can't be mistaken
> for a locale marker and silently truncate the document. Strongly recommended in
> production; when omitted, any locale-shaped line is treated as a marker.

**Expected raw payload**

```jsonc
{
  "content": "...multi-locale markdown blob...", // required, non-empty string
  "status": 1,                                    // optional numeric code
  "version": "2026-06"                            // optional string
}
```

**What it does**

1. **Splits `content` by locale.** Each locale segment begins with a bare
   locale-code line (e.g. `en`, `zh-TW`); everything up to the next such line is
   that segment's markdown. Lines before the first marker are ignored. A blob
   with no markers is treated as a single locale-less segment.
2. **Selects a segment** by `options.locale` (case-insensitive); falls back to
   the **first** segment when omitted or not found.
3. **Extracts checkboxes** from task-list items — `- [ ]`, `- [x]`, `* [ ]`, etc.
   `defaultChecked` comes from the `[x]` marker; everything else stays in the body.
4. **Derives the title** from the segment's first H1 (`extractTitle`), or
   `DEFAULT_CONSENT_TITLE` (`''`), and **removes that H1 line** from
   `contentMarkdown` so the title can be rendered separately.
5. **Maps `status`** numeric code → `ConsentStatus`.

**Errors** — throws `ConsentNormalizeError` when `raw` isn't an object, or when
`content` is missing / not a non-empty string.

```ts
const data = normalizeConsent(await fetchConsent('/consent/123'), {
  locale: 'zh-TW',
  knownLocales: ['en', 'zh-TW'],
});
```

**Example `content` blob**

```text
en
# Terms of Service

By continuing you agree to our terms.

- [ ] I have read and accept the [terms](https://example.com/terms)
- [ ] I consent to the processing of my personal data

zh-TW
# 服務條款

繼續即表示您同意條款。

- [ ] 我已閱讀並同意[服務條款](https://example.com/terms)
- [ ] 我同意個人資料之處理
```

> Every checkbox is a **required** consent gate; labels may contain inline
> markdown (links/bold). Optional, non-gating opt-ins (e.g. a newsletter
> subscription) are not this component's job — render those separately.

---

## `extractTitle(markdown)`

```ts
function extractTitle(markdown: string): string | undefined;
```

Returns the first ATX-style H1 (`# Title`) in the string, or `undefined`. Only a
single leading `#` followed by a space counts (so `## Sub` is ignored). Pure /
RSC-safe.

---

## `useConsent(options)` — headless hook

The engine behind `ConsentRenderer`. Resolves data (from `data` or an optional
same-origin fetch), renders the markdown body, and tracks checkbox state plus
`required` gating — imposing **no** layout.

### Options — `UseConsentOptions`

| Option         | Type                  | Notes                                                            |
| -------------- | --------------------- | ---------------------------------------------------------------- |
| `data?`         | `ConsentData`         | Pre-normalized data (e.g. from an RSC). Takes priority.          |
| `fetchOptions?` | `ConsentFetchOptions` | Same-origin client fetch; used **only** when `data` is absent.   |
| `locale?`       | `string`              | Locale segment to resolve (client/fetch path). Ignored with `data`.|
| `knownLocales?` | `string[]`            | Forwarded to `normalizeConsent` on the fetch path; see above. Ignored with `data`. |
| `markdown?`     | `UseMarkdownOptions`  | Forwarded to the markdown renderer for the body.                 |

### Result — `UseConsentResult`

| Field               | Type                    | Notes                                              |
| ------------------- | ----------------------- | -------------------------------------------------- |
| `data`              | `ConsentData \| undefined` | `undefined` while a client fetch is pending.    |
| `nodes`             | `ReactElement`          | Rendered markdown body.                            |
| `checkboxes`        | `ConsentCheckboxState[]`| Each `ConsentCheckbox` + live `checked: boolean`.  |
| `toggle`            | `(id: string) => void`  | Flip one checkbox by id.                           |
| `allRequiredChecked`| `boolean`               | `true` once every `required` box is checked.       |
| `loading`           | `boolean`               | `true` while the client fetch is in flight.        |
| `error`             | `Error \| undefined`    | Set when the fetch / normalization fails.          |

**Behavior notes**

- When `data` is provided, no fetch happens and `loading` starts `false`.
- The client fetch re-runs when `locale`, `endpoint`, `method`, or `payload`
  change; it aborts on unmount/change via `AbortController`.
- Checkbox state resets to `defaultChecked` only when the **document** changes —
  keyed on `version` (consent is per-version; locale is pure i18n), not on the
  `data` object's identity. So an unrelated parent re-render that recreates the
  `data` object will **not** wipe the user's ticks, and switching locale on the
  same version keeps them. As a safety guard, a change in the **number** of
  checkboxes under the same version also resets, rather than carrying a tick onto
  a different clause.

### `ConsentFetchOptions`

Targets a **consumer-owned, same-origin** route handler (e.g. `/api/consent`).
The browser sends the session cookie automatically; the handler does auth. The
library never adds an auth header itself.

| Field      | Type                                            | Default |
| ---------- | ----------------------------------------------- | ------- |
| `endpoint` | `string`                                        | —       |
| `method?`  | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | `'GET'` |
| `payload?` | `unknown` (JSON-serialized when present)        | —       |
| `headers?` | `Record<string, string>`                        | —       |

> When `payload` is present, `content-type: application/json` is added
> automatically (your `headers` can override it).

---

## `ConsentRenderer` — drop-in component

Renders the consent `title` as a separate `<h1>` (company prose theme), then the
consent body, then its checkboxes. `ConsentRendererProps` extends
`UseConsentOptions`, plus:

| Prop                | Type                                        | Default            | Notes                                            |
| ------------------- | ------------------------------------------- | ------------------ | ------------------------------------------------ |
| `className?`        | `string`                                    | —                  | Appended to the consent wrapper.                 |
| `onChange?`         | `(checkboxes: ConsentCheckboxState[]) => void` | —               | Fires whenever any checkbox toggles.             |
| `onValidityChange?` | `(allRequiredChecked: boolean) => void`     | —                  | Fires when the required-checkbox gate flips. **Drive your submit button's `disabled` from this** — it's the single source of truth, since a custom/Radix checkbox slot has no native `required` to block submission. |
| `renderStatus?`     | `(args: { status; data }) => ReactNode`     | —                  | Overrides what renders when `status` is not `pending`. By default a `consented` / `expired` document renders **nothing** (never re-presents a signable form). |
| `showCheckboxes?`   | `boolean`                                   | `true`             | Render the checkbox list.                        |
| `components?`       | `{ Checkbox?: ConsentCheckboxComponent }`   | native `<input>`   | Override the checkbox slot.                      |
| `loadingFallback?`  | `ReactNode`                                 | `null`             | Shown during a client fetch.                     |
| `renderError?`      | `(error: Error) => ReactNode`               | —                  | Rendered when a client fetch fails.              |

### Server-fetched (RSC) usage

```tsx
// app/consent/page.tsx  (Server Component)
import { normalizeConsent } from 'hcm-consent';
import { ConsentForm } from './consent-form';

export default async function Page() {
  const raw = await fetchConsent('/consent/123');
  const data = normalizeConsent(raw, { locale: 'zh-TW' });
  return <ConsentForm data={data} />;
}
```

```tsx
// app/consent/consent-form.tsx
'use client';
import { useState } from 'react';
import { ConsentRenderer, type ConsentData } from 'hcm-consent';

export function ConsentForm({ data }: { data: ConsentData }) {
  const [ok, setOk] = useState(false);

  async function record() {
    // The library stops at gating; you record the decision. Submit the
    // document `version` (the consent identity) to your own endpoint.
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: data.version }),
    });
  }

  return (
    <form action={record}>
      {/* `allRequiredChecked` is the single source of truth for the gate. */}
      <ConsentRenderer data={data} onValidityChange={setOk} />
      <button type="submit" disabled={!ok}>Agree</button>
    </form>
  );
}
```

### Client-fetched usage

```tsx
'use client';
import { ConsentRenderer } from 'hcm-consent';

<ConsentRenderer
  fetchOptions={{ endpoint: '/api/consent/123' }}
  locale="zh-TW"
  loadingFallback={<p>Loading…</p>}
  renderError={(err) => <p role="alert">{err.message}</p>}
/>;
```

### Custom checkbox (shadcn / Radix)

The slot API (`checked` + `onCheckedChange`) is deliberately shaped like
Radix/shadcn's `Checkbox`, so it's a drop-in:

```tsx
import { Checkbox } from '@/components/ui/checkbox';

<ConsentRenderer data={data} components={{ Checkbox }} />;
```

`ConsentCheckboxComponentProps`:

```ts
interface ConsentCheckboxComponentProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: ConsentCheckedState) => void; // boolean | 'indeterminate'
  required?: boolean;
}
```

---

## Constants

| Export                   | Value                                 |
| ------------------------ | ------------------------------------- |
| `CONSENT_STATUSES`       | `['pending', 'consented', 'expired']` |
| `DEFAULT_CONSENT_STATUS` | `'pending'`                           |
| `DEFAULT_CONSENT_TITLE`  | `''`                                  |

---

## Notes & gotchas

- **Checkboxes are always `required: true`.** The markdown carries no per-box
  optional flag, so every parsed box gates `allRequiredChecked`. Optional,
  non-gating opt-ins are out of scope — render them outside this component.
- **`label` is inline markdown** (links / bold / em), rendered via the markdown
  layer. Embedded links open in a new tab and don't toggle the box. Block-level
  markdown in a label is not supported.
- **Recording consent is the consumer's job.** The library gates (exposes
  `allRequiredChecked` / `onValidityChange`) but never submits. Record the
  decision against `data.version` via your own same-origin endpoint.
- **Consent is per-`version`, not per-locale.** Locale is purely i18n; signing a
  version in one locale covers it in all. `status` reflects that version.
- **`headers`/cookies:** the library never injects auth. For the client path, the
  endpoint must be same-origin so the cookie rides along.
- **Locale matching is case-insensitive**, with a first-segment fallback — a
  missing locale never throws, it just falls back. Pass `knownLocales` so stray
  body lines can't be misread as locale markers.
