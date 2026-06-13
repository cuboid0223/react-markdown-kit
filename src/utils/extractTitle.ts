/**
 * Pull the first level-1 heading (`# Title`) out of a markdown string.
 *
 * Only ATX-style H1 lines are considered (a single leading `#` followed by a
 * space). Returns `undefined` when no H1 is present, so callers can decide on a
 * fallback. Pure — safe to import from a React Server Component.
 *
 * @example
 * extractTitle('# Consent\n\nBody') // 'Consent'
 * extractTitle('## Sub only')       // undefined
 */
export function extractTitle(markdown: string): string | undefined {
  for (const rawLine of markdown.split('\n')) {
    const match = /^#[ \t]+(.+?)[ \t]*#*\s*$/.exec(rawLine.trim());
    if (match?.[1]) {
      const title = match[1].trim();
      if (title) return title;
    }
  }
  return undefined;
}
