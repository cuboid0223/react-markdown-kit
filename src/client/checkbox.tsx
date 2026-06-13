'use client';

import type { ComponentType } from 'react';

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

/**
 * The checkbox **adapter seam**. This is the single place the default consent
 * checkbox is defined. To switch the default to the company UI (tsmcUI), replace
 * the body here with an adapter over its `Checkbox`, mapping its props to this
 * slot's `checked` / `onCheckedChange(boolean | 'indeterminate')` / `required` /
 * `id` API — nothing else in the renderer needs to change. (Per-consumer
 * overrides still go through `ConsentRenderer`'s `components.Checkbox`.)
 *
 * Current implementation: a native `<input type="checkbox">`. Note that once
 * this becomes a non-native component, the native `required` no longer blocks
 * form submission — gating is carried by `allRequiredChecked` / `onValidityChange`.
 */
export function DefaultCheckbox({
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
