'use client';

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';
import MarkdownToJsx, { type MarkdownToJSX } from 'markdown-to-jsx';
import {
  useConsent,
  type ConsentCheckboxState,
  type UseConsentOptions,
} from '../hooks/useConsent';
import type { ConsentData, ConsentStatus } from '../types';
import { BRAND_PROSE, CLASS_PREFIX } from '../styles/tokens';
import {
  DefaultCheckbox,
  type ConsentCheckboxComponent,
} from './checkbox';

// Re-exported so the public entry point (and `import` paths) stay stable.
export type {
  ConsentCheckedState,
  ConsentCheckboxComponentProps,
  ConsentCheckboxComponent,
} from './checkbox';

/**
 * A link inside a checkbox label. Opening the link must not toggle the box:
 * `<a>` is interactive content so the browser already suppresses label-click
 * forwarding for it, and `stopPropagation` guards the rest. Opens in a new tab
 * so reading the terms doesn't navigate away from the consent form.
 */
function LabelLink({
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      target={props.target ?? '_blank'}
      rel={props.rel ?? 'noreferrer'}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    />
  );
}

// Render a checkbox label as inline markdown (links / bold / em only — no block
// elements), with links routed through LabelLink.
const LABEL_MD_OPTIONS: MarkdownToJSX.Options = {
  forceInline: true,
  wrapper: Fragment,
  overrides: { a: LabelLink },
};

/** Render one checkbox label string as inline markdown. */
function ConsentLabel({ label }: { label: string }) {
  return <MarkdownToJsx options={LABEL_MD_OPTIONS}>{label}</MarkdownToJsx>;
}

export interface ConsentRendererProps extends UseConsentOptions {
  /** Extra class names appended to the consent wrapper. */
  className?: string;
  /** Fired whenever any checkbox toggles, with the full checkbox state. */
  onChange?: (checkboxes: ConsentCheckboxState[]) => void;
  /**
   * Fired whenever the required-checkbox gate flips. `allRequiredChecked` is the
   * single source of truth for "can the user consent" — drive your submit
   * button's `disabled` from this rather than recomputing it yourself. Native
   * `required` is not relied on (a custom/Radix checkbox slot has no native
   * input to block submission).
   */
  onValidityChange?: (allRequiredChecked: boolean) => void;
  /**
   * Override what renders when `data.status` is not `pending` (i.e. already
   * `consented`, or `expired`). By default a non-`pending` document renders
   * `null` — a safe default so an already-signed or expired version never
   * re-presents a fresh, signable form. Return your own read-only / expired UI.
   */
  renderStatus?: (args: {
    status: ConsentStatus;
    data: ConsentData;
  }) => ReactNode;
  /** Whether to render the checkbox list. @default true */
  showCheckboxes?: boolean;
  /**
   * Override the rendering of specific slots. `Checkbox` defaults to a native
   * `<input>`; pass your shadcn `Checkbox` (Radix-based) for a drop-in match —
   * its `checked` / `onCheckedChange` API already matches.
   */
  components?: { Checkbox?: ConsentCheckboxComponent };
  /** Shown while a client-side fetch is in flight. */
  loadingFallback?: ReactNode;
  /** Rendered when a client-side fetch fails. */
  renderError?: (error: Error) => ReactNode;
}

/**
 * Renders a consent document: the markdown body (in the company prose theme)
 * followed by its checkboxes.
 *
 * Pass `data` (e.g. fetched + normalized in an RSC) or `fetchOptions` (a
 * same-origin route handler). Requires the stylesheet to be imported once:
 *   import 'hcm-consent/styles.css';
 */
export function ConsentRenderer({
  className,
  onChange,
  onValidityChange,
  renderStatus,
  showCheckboxes = true,
  components,
  loadingFallback = null,
  renderError,
  ...consentOptions
}: ConsentRendererProps) {
  const { data, nodes, checkboxes, toggle, allRequiredChecked, loading, error } =
    useConsent(consentOptions);
  const Checkbox = components?.Checkbox ?? DefaultCheckbox;
  const baseId = useId();

  // Notify the consumer of checkbox changes after render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(checkboxes);
  }, [checkboxes]);

  // Notify the consumer when the required-checkbox gate flips.
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  useEffect(() => {
    onValidityChangeRef.current?.(allRequiredChecked);
  }, [allRequiredChecked]);

  if (loading) return <>{loadingFallback}</>;
  if (error) return <>{renderError ? renderError(error) : null}</>;

  // A non-pending document (already consented, or expired) must not re-present a
  // fresh signable form. Default to nothing; let the consumer supply status UI.
  if (data && data.status !== 'pending') {
    return <>{renderStatus ? renderStatus({ status: data.status, data }) : null}</>;
  }

  const wrapperClass = [`${CLASS_PREFIX}-consent`, 'space-y-4', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      {data?.title && (
        <div className={`${CLASS_PREFIX}-consent-title ${BRAND_PROSE}`}>
          <h1>{data.title}</h1>
        </div>
      )}

      <div className={`${CLASS_PREFIX}-consent-body`}>{nodes}</div>

      {showCheckboxes && checkboxes.length > 0 && (
        <ul
          className={`${CLASS_PREFIX}-consent-checkboxes m-0 list-none space-y-2 p-0`}
        >
          {checkboxes.map((cb) => {
            const inputId = `${baseId}-${cb.id}`;
            return (
              <li
                key={cb.id}
                className={`${CLASS_PREFIX}-consent-checkbox flex items-start gap-2`}
              >
                <Checkbox
                  id={inputId}
                  checked={cb.checked}
                  required={cb.required}
                  onCheckedChange={() => toggle(cb.id)}
                />
                <label
                  htmlFor={inputId}
                  className="cursor-pointer text-sm leading-5"
                >
                  <ConsentLabel label={cb.label} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
