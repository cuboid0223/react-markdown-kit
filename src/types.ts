/**
 * Shared, serializable types for the consent feature.
 *
 * These are framework-agnostic and contain no React or transport code, so they
 * can be imported from a React Server Component as freely as from the client.
 */

/** Lifecycle status of a consent document for the current user. */
export type ConsentStatus = 'pending' | 'consented' | 'expired';

/** A single checkbox the user can (or must) tick before consenting. */
export interface ConsentCheckbox {
  /** Stable identifier, unique within a `ConsentData`. */
  id: string;
  /** Label shown next to the checkbox (plain text). */
  label: string;
  /** When `true`, this box must be checked for consent to be allowed. */
  required: boolean;
  /** Initial checked state. @default false */
  defaultChecked?: boolean;
}

/**
 * The normalized consent document. Every data-loading path (server-side fetch
 * helper or client-side `useConsent`) produces this exact shape via
 * {@link normalizeConsent}, and {@link ConsentRenderer} consumes it.
 *
 * Kept JSON-serializable on purpose so it can cross an RSC → client boundary.
 */
export interface ConsentData {
  /** Optional document id (e.g. for submitting the consent decision). */
  id?: string;
  /** Display title. Falls back to the markdown's first H1 during normalization. */
  title: string;
  /** Markdown source of the consent body (checkbox items extracted out). */
  contentMarkdown: string;
  /** Checkboxes parsed from the body's task-list items (`- [ ]` / `- [x]`). */
  checkboxes: ConsentCheckbox[];
  /** Overall lifecycle status (mapped from the backend's numeric status). */
  status: ConsentStatus;
  /** The locale segment this data was resolved from, when known. */
  locale?: string;
  /** Document version, passed through from the backend payload. */
  version?: string;
}

/**
 * Declarative options for the optional **client-side** fetch in `useConsent`.
 *
 * This targets a consumer-owned, same-origin route handler (e.g. `/api/consent`)
 * — the browser sends the session cookie automatically and the handler performs
 * auth. The library never adds an auth header itself.
 */
export interface ConsentFetchOptions {
  /** Same-origin endpoint to fetch (e.g. `/api/consent/123`). */
  endpoint: string;
  /** HTTP method. @default 'GET' */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Optional request body; JSON-serialized when present. */
  payload?: unknown;
  /** Extra request headers (the lib adds none of its own beyond these). */
  headers?: Record<string, string>;
}
