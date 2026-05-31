import type { ReactElement } from 'react';
import { Markdown, type MarkdownProps } from '../components/Markdown';

export type MdToReactElementOptions = Omit<MarkdownProps, 'content'>;

/**
 * Pure helper: turn a markdown string into a React element.
 *
 * Returns an element — the actual rendering (and any hooks inside
 * react-markdown) runs when React mounts it, so call this anywhere you
 * can place JSX.
 *
 * @example
 * const el = mdToReactElement('## Title\n\nBody text');
 * root.render(el);
 */
export function mdToReactElement(
  content: string,
  options: MdToReactElementOptions = {},
): ReactElement {
  return <Markdown content={content} {...options} />;
}
