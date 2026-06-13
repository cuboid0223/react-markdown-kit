import type { ConsentStatus } from './types';

/** Allowed consent lifecycle statuses, in order. */
export const CONSENT_STATUSES = ['pending', 'consented', 'expired'] as const;

/** Status applied when a raw payload omits one. */
export const DEFAULT_CONSENT_STATUS: ConsentStatus = 'pending';

/** Title used when a payload has neither an explicit title nor an H1. */
export const DEFAULT_CONSENT_TITLE = '';
