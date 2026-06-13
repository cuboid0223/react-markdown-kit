'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useMarkdown, type UseMarkdownOptions } from './useMarkdown';
import { normalizeConsent } from '../utils/normalizeConsent';
import type {
  ConsentCheckbox,
  ConsentData,
  ConsentFetchOptions,
} from '../types';

/** A checkbox plus its live checked state. */
export interface ConsentCheckboxState extends ConsentCheckbox {
  checked: boolean;
}

export interface UseConsentOptions {
  /** Pre-normalized consent data (e.g. fetched in an RSC). */
  data?: ConsentData;
  /**
   * Same-origin fetch options for the client path. Used only when `data` is
   * absent. The response is run through {@link normalizeConsent}.
   */
  fetchOptions?: ConsentFetchOptions;
  /**
   * Locale segment to resolve from the fetched payload (client path only).
   * Forwarded to {@link normalizeConsent}; ignored when `data` is provided.
   */
  locale?: string;
  /**
   * Locale codes the backend emits, forwarded to {@link normalizeConsent} on the
   * client-fetch path so stray body lines can't be mistaken for locale markers.
   * Ignored when `data` is provided. See `NormalizeConsentOptions.knownLocales`.
   */
  knownLocales?: string[];
  /** Options forwarded to the markdown renderer for the body. */
  markdown?: UseMarkdownOptions;
}

export interface UseConsentResult {
  /** The resolved consent data, or `undefined` while a client fetch is pending. */
  data: ConsentData | undefined;
  /** Rendered markdown body element. */
  nodes: ReactElement;
  /** Checkboxes augmented with live `checked` state. */
  checkboxes: ConsentCheckboxState[];
  /** Flip one checkbox by id. */
  toggle: (id: string) => void;
  /** `true` once every `required` checkbox is checked. */
  allRequiredChecked: boolean;
  /** `true` while the client fetch is in flight. */
  loading: boolean;
  /** Populated when the client fetch (or normalization) fails. */
  error: Error | undefined;
}

function initialChecked(data: ConsentData | undefined): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const cb of data?.checkboxes ?? []) {
    state[cb.id] = cb.defaultChecked === true;
  }
  return state;
}

/**
 * Headless engine behind `ConsentRenderer`. Resolves consent data (from `data`
 * or an optional same-origin fetch), renders the markdown body, and tracks
 * checkbox state plus `required` gating — without imposing any layout.
 */
export function useConsent({
  data: dataProp,
  fetchOptions,
  locale,
  knownLocales,
  markdown,
}: UseConsentOptions): UseConsentResult {
  const [fetched, setFetched] = useState<ConsentData | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(
    dataProp === undefined && fetchOptions !== undefined,
  );
  const [error, setError] = useState<Error | undefined>(undefined);

  const shouldFetch = dataProp === undefined && fetchOptions !== undefined;

  useEffect(() => {
    if (!shouldFetch || !fetchOptions) return;

    const controller = new AbortController();
    setLoading(true);
    setError(undefined);

    const { endpoint, method = 'GET', payload, headers } = fetchOptions;

    fetch(endpoint, {
      method,
      headers:
        payload !== undefined
          ? { 'content-type': 'application/json', ...headers }
          : headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`consent fetch failed: ${res.status}`);
        return normalizeConsent(await res.json(), { locale, knownLocales });
      })
      .then((normalized) => {
        setFetched(normalized);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => controller.abort();
    // Re-fetch only when the request inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch, locale, JSON.stringify(knownLocales), fetchOptions?.endpoint, fetchOptions?.method, JSON.stringify(fetchOptions?.payload)]);

  const data = dataProp ?? fetched;

  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    initialChecked(data),
  );

  // Reset checkbox state only when the underlying *document* changes — keyed on
  // the stable `version` (consent is per-version; locale is pure i18n), not the
  // `data` object identity. Keying on identity reset the user's ticks on every
  // unrelated parent re-render that recreated `data`, which silently undid
  // `toggle`. Falls back to the body text when a payload carries no version.
  //
  // The checkbox count is folded in as a structural guard: switching locale on
  // the same version keeps ticks (parallel boxes, just translated labels) — but
  // if the box *count* differs across that version (e.g. a locale missing a
  // line), we reset rather than carry a tick onto a different clause. We trust
  // ordering and don't compare labels, since translations legitimately differ.
  const docKey = `${data?.version ?? data?.contentMarkdown ?? ''}#${
    data?.checkboxes.length ?? 0
  }`;
  useEffect(() => {
    setChecked(initialChecked(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const nodes = useMarkdown(data?.contentMarkdown ?? '', markdown);

  const checkboxes = useMemo<ConsentCheckboxState[]>(
    () =>
      (data?.checkboxes ?? []).map((cb) => ({
        ...cb,
        checked: checked[cb.id] ?? false,
      })),
    [data, checked],
  );

  const allRequiredChecked = useMemo(
    () =>
      (data?.checkboxes ?? [])
        .filter((cb) => cb.required)
        .every((cb) => checked[cb.id] === true),
    [data, checked],
  );

  return { data, nodes, checkboxes, toggle, allRequiredChecked, loading, error };
}
