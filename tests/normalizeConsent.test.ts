import { describe, it, expect } from 'vitest';
import {
  normalizeConsent,
  ConsentNormalizeError,
} from '../src/utils/normalizeConsent';

// Mirrors the real backend payload: a single `content` string packing every
// locale, each introduced by a bare locale-code line, with checkboxes embedded
// as task-list items.
const raw = {
  content:
    'zh-TW\n# 這是標題\n這是內容\n- [] 這是label\n\nen\n# this is title\nthis is content\n- [x] this is label\n\n ',
  status: 0,
  version: '1',
};

describe('normalizeConsent', () => {
  it('selects the requested locale segment', () => {
    const data = normalizeConsent(raw, { locale: 'zh-TW' });
    expect(data.locale).toBe('zh-TW');
    expect(data.title).toBe('這是標題');
    expect(data.contentMarkdown).toBe('這是內容');
    expect(data.version).toBe('1');
  });

  it('extracts task-list items as checkboxes, checked from the marker', () => {
    const zh = normalizeConsent(raw, { locale: 'zh-TW' });
    expect(zh.checkboxes).toEqual([
      { id: 'cb-0', label: '這是label', required: true, defaultChecked: false },
    ]);

    const en = normalizeConsent(raw, { locale: 'en' });
    expect(en.contentMarkdown).toBe('this is content');
    expect(en.checkboxes[0]).toMatchObject({
      label: 'this is label',
      defaultChecked: true, // `- [x]`
    });
  });

  it('maps the numeric status to the lifecycle status', () => {
    expect(normalizeConsent(raw, { locale: 'en' }).status).toBe('pending'); // 0
    expect(
      normalizeConsent({ ...raw, status: 1 }, { locale: 'en' }).status,
    ).toBe('consented');
    expect(
      normalizeConsent({ ...raw, status: 99 }, { locale: 'en' }).status,
    ).toBe('pending'); // unknown → default
  });

  it('falls back to the first segment when the locale is not found', () => {
    const data = normalizeConsent(raw, { locale: 'ja' });
    expect(data.locale).toBe('zh-TW');
  });

  it('treats content with no locale markers as a single segment', () => {
    const data = normalizeConsent({ content: '# Solo\n\nbody\n- [] agree' });
    expect(data.locale).toBeUndefined();
    expect(data.title).toBe('Solo');
    expect(data.checkboxes).toHaveLength(1);
  });

  it('throws on a non-object payload', () => {
    expect(() => normalizeConsent(null)).toThrow(ConsentNormalizeError);
  });

  it('throws when content is missing', () => {
    expect(() => normalizeConsent({ status: 0 })).toThrow(ConsentNormalizeError);
  });
});
