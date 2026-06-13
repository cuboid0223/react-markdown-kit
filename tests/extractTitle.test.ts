import { describe, it, expect } from 'vitest';
import { extractTitle } from '../src/utils/extractTitle';

describe('extractTitle', () => {
  it('returns the first H1', () => {
    expect(extractTitle('# Consent\n\nBody text')).toBe('Consent');
  });

  it('ignores H2 and deeper', () => {
    expect(extractTitle('## Sub only\n\ntext')).toBeUndefined();
  });

  it('returns the first H1 when several headings exist', () => {
    expect(extractTitle('## intro\n# Real Title\n# Second')).toBe('Real Title');
  });

  it('trims trailing closing hashes and whitespace', () => {
    expect(extractTitle('#   Spaced Title   #')).toBe('Spaced Title');
  });

  it('returns undefined when there is no heading', () => {
    expect(extractTitle('just a paragraph')).toBeUndefined();
  });

  it('does not treat a hash without a space as a heading', () => {
    expect(extractTitle('#NotAHeading')).toBeUndefined();
  });
});
