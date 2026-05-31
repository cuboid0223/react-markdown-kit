import type { ComponentProps } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { BRAND_PROSE, CLASS_PREFIX } from '../styles/tokens';

type ReactMarkdownProps = ComponentProps<typeof ReactMarkdown>;

export interface MarkdownProps
  extends Omit<ReactMarkdownProps, 'children' | 'components'> {
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
  /** Override the rendering of specific elements (passed to react-markdown). */
  components?: Components;
}

/**
 * Renders a markdown string as React elements, styled with the company
 * Tailwind Typography (`prose`) theme.
 *
 * Requires the stylesheet to be imported once in the consuming app:
 *   import '@your-org/react-markdown-kit/styles.css';
 *
 * @example
 * <Markdown content="# Hello **world**" />
 */
export function Markdown({
  content,
  className,
  brand = true,
  components,
  ...rest
}: MarkdownProps) {
  const wrapperClass = [`${CLASS_PREFIX}-root`, brand && BRAND_PROSE, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      <ReactMarkdown components={components} {...rest}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
