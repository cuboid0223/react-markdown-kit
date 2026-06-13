import { DEFAULT_CONSENT_STATUS, DEFAULT_CONSENT_TITLE } from '../const';
import type { ConsentCheckbox, ConsentData, ConsentStatus } from '../types';
import { extractTitle } from './extractTitle';

/** Thrown by {@link normalizeConsent} when a raw payload is malformed. */
export class ConsentNormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentNormalizeError';
  }
}

export interface NormalizeConsentOptions {
  /**
   * Which locale segment of `content` to use. Matched case-insensitively
   * against each segment's locale header; falls back to the **first** segment
   * when omitted or not found.
   */
  locale?: string;
  /**
   * The locale codes the backend actually emits (e.g. `['en', 'zh-TW']`). When
   * provided, **only** a line that exactly matches one of these (case-insensitive)
   * is treated as a locale marker — so an ordinary one-word body line (`ok`,
   * `yes`, …) can no longer be mistaken for a segment boundary and silently
   * truncate the document. When omitted, any locale-shaped line is a marker
   * (legacy behavior).
   */
  knownLocales?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A standalone line that is just a BCP-47-ish locale code, e.g. `en`, `zh-TW`.
const LOCALE_MARKER = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/;

interface LocaleSegment {
  locale: string;
  markdown: string;
}

/**
 * Whether `line` introduces a new locale segment. A line must look like a locale
 * code; additionally, when `knownLocales` is given, it must be one of them
 * (case-insensitive) — otherwise a stray body line like `ok` would falsely open
 * a segment and silently drop everything after it.
 */
function isLocaleMarker(line: string, knownLocales?: string[]): boolean {
  const trimmed = line.trim();
  if (!LOCALE_MARKER.test(trimmed)) return false;
  if (knownLocales && knownLocales.length > 0) {
    const lower = trimmed.toLowerCase();
    return knownLocales.some((l) => l.toLowerCase() === lower);
  }
  return true;
}

/**
 * Split the multi-locale `content` blob into segments. Each segment starts with
 * a line that is just a locale code; everything up to the next such line is that
 * locale's markdown.
 */
function splitByLocale(content: string, knownLocales?: string[]): LocaleSegment[] {
  const segments: { locale: string; lines: string[] }[] = [];
  let current: { locale: string; lines: string[] } | undefined;

  for (const line of content.split(/\r?\n/)) {
    if (isLocaleMarker(line, knownLocales)) {
      current = { locale: line.trim(), lines: [] };
      segments.push(current);
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first marker are ignored.
  }

  if (segments.length === 0) {
    // No locale markers — treat the whole blob as a single, locale-less segment.
    return [{ locale: '', markdown: content.trim() }];
  }
  return segments.map((s) => ({
    locale: s.locale,
    markdown: s.lines.join('\n').trim(),
  }));
}

function selectSegment(
  segments: LocaleSegment[],
  locale: string | undefined,
): LocaleSegment {
  if (locale) {
    const match = segments.find(
      (s) => s.locale.toLowerCase() === locale.toLowerCase(),
    );
    if (match) return match;
  }
  // Fallback to the first segment (segments always has at least one entry).
  return segments[0]!;
}

// An ATX H1 line (`# Title`) — mirrors the heading `extractTitle` picks up.
const H1_LINE = /^#[ \t]+.+?[ \t]*#*\s*$/;

/** Drop the first H1 line from a body, so the title can render separately. */
function stripFirstH1(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const idx = lines.findIndex((line) => H1_LINE.test(line.trim()));
  if (idx === -1) return markdown;
  lines.splice(idx, 1);
  return lines.join('\n').trim();
}

// A task-list item: `- [] label`, `- [ ] label`, or `- [x] label`.
const CHECKBOX_LINE = /^\s*[-*]\s+\[\s*([xX])?\s*\]\s*(.*)$/;

/** Pull task-list items out of a segment into checkboxes; keep the rest as body. */
function parseSegment(markdown: string): {
  body: string;
  checkboxes: ConsentCheckbox[];
} {
  const bodyLines: string[] = [];
  const checkboxes: ConsentCheckbox[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = CHECKBOX_LINE.exec(line);
    if (match) {
      checkboxes.push({
        id: `cb-${checkboxes.length}`,
        label: (match[2] ?? '').trim(),
        // Consent boxes must be ticked; the markdown carries no per-box flag.
        required: true,
        // Initial checked state comes from the `[x]` / `[]` marker.
        defaultChecked: match[1] !== undefined,
      });
    } else {
      bodyLines.push(line);
    }
  }

  return { body: bodyLines.join('\n').trim(), checkboxes };
}

// Backend numeric status → lifecycle status. Overall record state, not per-box.
const STATUS_BY_CODE: Record<number, ConsentStatus> = {
  0: 'pending',
  1: 'consented',
  2: 'expired',
};

function mapStatus(value: unknown): ConsentStatus {
  const code = typeof value === 'number' ? value : Number(value);
  return STATUS_BY_CODE[code] ?? DEFAULT_CONSENT_STATUS;
}

/**
 * Turn the backend consent payload into a validated, serializable
 * {@link ConsentData} for one locale.
 *
 * The backend returns a single `content` string packing every locale (each
 * introduced by a bare locale-code line), with checkboxes embedded as
 * task-list items. This:
 * - picks the `locale` segment (or the first, as a fallback),
 * - extracts `- [ ]` / `- [x]` items into checkboxes (checked from the marker),
 * - derives the title from the segment's first H1,
 * - maps the numeric `status` to the overall lifecycle status.
 *
 * Throws {@link ConsentNormalizeError} on malformed input. Pure and
 * React-free — call it directly inside an RSC after fetching.
 *
 * @example
 * const data = normalizeConsent(await commonFetchHelper('/consent/123'), {
 *   locale: 'zh-TW',
 * });
 */
export function normalizeConsent(
  raw: unknown,
  options: NormalizeConsentOptions = {},
): ConsentData {
  if (!isRecord(raw)) {
    throw new ConsentNormalizeError('consent payload must be an object');
  }
  if (typeof raw.content !== 'string' || raw.content.trim() === '') {
    throw new ConsentNormalizeError(
      'consent payload is missing a "content" string',
    );
  }

  const segment = selectSegment(
    splitByLocale(raw.content, options.knownLocales),
    options.locale,
  );
  const { body, checkboxes } = parseSegment(segment.markdown);

  // Pull the title out of the body so callers can render it separately; the
  // body keeps everything below the first H1.
  const title = extractTitle(body);

  const data: ConsentData = {
    title: title ?? DEFAULT_CONSENT_TITLE,
    contentMarkdown: title ? stripFirstH1(body) : body,
    checkboxes,
    status: mapStatus(raw.status),
  };
  if (segment.locale) data.locale = segment.locale;
  if (typeof raw.version === 'string') data.version = raw.version;

  return data;
}
