export { Markdown } from './components/Markdown';
export type { MarkdownProps } from './components/Markdown';

export { useMarkdown } from './hooks/useMarkdown';
export type { UseMarkdownOptions } from './hooks/useMarkdown';

export { mdToReactElement } from './utils/mdToReactElement';
export type { MdToReactElementOptions } from './utils/mdToReactElement';

export { BRAND_PROSE, CLASS_PREFIX } from './styles/tokens';

// --- Consent feature: pure core (RSC-safe — no 'use client') ---
export { normalizeConsent, ConsentNormalizeError } from './utils/normalizeConsent';
export { extractTitle } from './utils/extractTitle';
export {
  CONSENT_STATUSES,
  DEFAULT_CONSENT_STATUS,
  DEFAULT_CONSENT_TITLE,
} from './const';
export type {
  ConsentData,
  ConsentCheckbox,
  ConsentStatus,
  ConsentFetchOptions,
} from './types';
export type { NormalizeConsentOptions } from './utils/normalizeConsent';

// --- Consent feature: client surface (each carries its own 'use client') ---
export { ConsentRenderer } from './client/ConsentRenderer';
export type {
  ConsentRendererProps,
  ConsentCheckboxComponent,
  ConsentCheckboxComponentProps,
  ConsentCheckedState,
} from './client/ConsentRenderer';

export { useConsent } from './hooks/useConsent';
export type {
  UseConsentOptions,
  UseConsentResult,
  ConsentCheckboxState,
} from './hooks/useConsent';
