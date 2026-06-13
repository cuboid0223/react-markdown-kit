/** Class-name prefix applied to the wrapping element. */
export const CLASS_PREFIX = 'hcm';

/**
 * Default brand classes applied to the markdown wrapper.
 *
 * Uses the Tailwind Typography plugin (`prose`) plus brand element modifiers.
 * Brand colors come from the `@theme` block in `src/styles/markdown.css`
 * (`--color-brand-*`), so that file is the single source of truth — edit the
 * colors there and these utilities resolve to them.
 */
export const BRAND_PROSE = [
  'prose',
  'max-w-none',
  'prose-headings:text-brand-heading',
  'prose-a:text-brand-link',
  'prose-a:no-underline',
  'hover:prose-a:underline',
  'prose-code:text-brand-code',
  'prose-blockquote:border-brand-quote',
].join(' ');
