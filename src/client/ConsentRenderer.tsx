'use client';

import {
  useEffect,
  useId,
  useRef,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  useConsent,
  type ConsentCheckboxState,
  type UseConsentOptions,
} from '../hooks/useConsent';
import { BRAND_PROSE, CLASS_PREFIX } from '../styles/tokens';

/** Checked state, widened to match Radix/shadcn's `CheckedState`. */
export type ConsentCheckedState = boolean | 'indeterminate';

/**
 * Props the consent checkbox slot receives. Deliberately shaped like the
 * Radix/shadcn `Checkbox` API (`checked` + `onCheckedChange`) so a consumer can
 * drop their own `@/components/ui/checkbox` straight into `components.Checkbox`.
 */
export interface ConsentCheckboxComponentProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: ConsentCheckedState) => void;
  required?: boolean;
}

export type ConsentCheckboxComponent = ComponentType<ConsentCheckboxComponentProps>;

/** Default checkbox: a native `<input>` adapted to the slot's API. */
function DefaultCheckbox({
  id,
  checked,
  onCheckedChange,
  required,
}: ConsentCheckboxComponentProps) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      required={required}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="mt-1 h-4 w-4 shrink-0 accent-brand-link"
    />
  );
}

export interface ConsentRendererProps extends UseConsentOptions {
  /** Extra class names appended to the consent wrapper. */
  className?: string;
  /** Fired whenever any checkbox toggles, with the full checkbox state. */
  onChange?: (checkboxes: ConsentCheckboxState[]) => void;
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
  showCheckboxes = true,
  components,
  loadingFallback = null,
  renderError,
  ...consentOptions
}: ConsentRendererProps) {
  const { data, nodes, checkboxes, toggle, loading, error } =
    useConsent(consentOptions);
  const Checkbox = components?.Checkbox ?? DefaultCheckbox; // DefaultCheckbox 改成 tsmcUI
  const baseId = useId();

  // Notify the consumer of checkbox changes after render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(checkboxes);
  }, [checkboxes]);

  if (loading) return <>{loadingFallback}</>;
  if (error) return <>{renderError ? renderError(error) : null}</>;

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
                  {cb.label}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
