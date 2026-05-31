import { useMemo, type ReactElement } from 'react';
import { Markdown, type MarkdownProps } from '../components/Markdown';

export type UseMarkdownOptions = Omit<MarkdownProps, 'content'>;

/**
 * Hook form: returns a memoized React element for the given markdown string.
 *
 * @example
 * function Article({ md }: { md: string }) {
 *   const el = useMarkdown(md);
 *   return <article>{el}</article>;
 * }
 */
export function useMarkdown(
  content: string,
  options: UseMarkdownOptions = {},
): ReactElement {
  return useMemo(
    () => <Markdown content={content} {...options} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, JSON.stringify(options.components), options.className],
  );
}
