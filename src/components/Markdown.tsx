'use client';

import { Fragment } from 'react';
import MarkdownToJsx, { type MarkdownToJSX } from 'markdown-to-jsx';
import { BRAND_PROSE, CLASS_PREFIX } from '../styles/tokens';

export interface MarkdownProps {
  /** The markdown source string to render. */
  content: string;
  /**
   * Extra class names appended to the wrapper. Use Tailwind `prose-*`
   * modifiers here to tweak per element (e.g. `prose-lg prose-img:rounded-xl`).
   */
  className?: string;
  /**
   * Set to `false` to drop the default company prose styling (e.g. when you
   * want to supply your own classes via `className`).
   * @default true
   */
  brand?: boolean;
  /**
   * Options passed through to markdown-to-jsx — most usefully `overrides`, to
   * replace the rendering of specific elements.
   */
  options?: MarkdownToJSX.Options;
}

/**
 * Renders a markdown string as React elements, styled with the company
 * Tailwind Typography (`prose`) theme. Built on markdown-to-jsx.
 *
 * Requires the stylesheet to be imported once in the consuming app:
 *   import 'hcm-consent/styles.css';
 *
 * @example
 * <Markdown content="# Hello **world**" />
 */
export function Markdown({
  content,
  className,
  brand = true,
  options,
}: MarkdownProps) {
  const wrapperClass = [`${CLASS_PREFIX}-root`, brand && BRAND_PROSE, className]
    .filter(Boolean)
    .join(' ');

  // Default to a Fragment wrapper so the markdown elements sit directly under
  // our prose wrapper (keeps `prose > :first-child` rules working). Consumers
  // can override via `options.wrapper`.
  const mergedOptions: MarkdownToJSX.Options = { wrapper: Fragment, ...options };

  return (
    <div className={wrapperClass}>
      <MarkdownToJsx options={mergedOptions}>{content}</MarkdownToJsx>
    </div>
  );
}
