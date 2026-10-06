// Only these public diagnostics may leave the server. Never relay provider messages,
// request URLs, resource names, credentials, or arbitrary error-body fields.
const codes = new Set(['QUOTA_LIMIT', 'PHOTO_STALE', 'PHOTO_RESOURCE_INVALID', 'PHOTO_RESOURCE_UNAVAILABLE',
  'PHOTO_ACCESS_DENIED', 'PHOTO_QUOTA_OR_ACCESS', 'MISSING_METADATA', 'IMAGE_LOAD_FAILED', 'CANCELLED', 'TIMEOUT', 'NETWORK_ERROR',
  'PROVIDER_UNAVAILABLE', 'PROVIDER_CONFIGURATION', 'NOT_CONFIGURED', 'INVALID_REQUEST', 'INVALID_RESPONSE'])
const sources = new Set(['google', 'nom-budget-minute', 'nom-budget-day', 'metadata', 'endpoint', 'network', 'image'])
const reasons = new Set(['RESOURCE_EXHAUSTED', 'PERMISSION_DENIED', 'INVALID_ARGUMENT', 'NOT_FOUND',
  'RATE_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'DAILY_LIMIT_EXCEEDED', 'API_KEY_INVALID', 'API_KEY_SERVICE_BLOCKED', 'SERVICE_DISABLED'])
export function placeExtraErrorInfo(error, fallbackSource = 'endpoint') {
  return {
    code: codes.has(error?.code) ? error.code : 'PROVIDER_UNAVAILABLE',
    source: sources.has(error?.source) ? error.source : fallbackSource,
    ...(Number.isInteger(error?.upstreamStatus) && error.upstreamStatus >= 400 && error.upstreamStatus <= 599 ? { upstreamStatus: error.upstreamStatus } : {}),
    ...(reasons.has(error?.reason) ? { reason: error.reason } : {}),
    ...(Number.isFinite(error?.retryAfterMs) && error.retryAfterMs > 0 ? { retryAfterMs: Math.min(86_400_000, error.retryAfterMs) } : {}),
  }
}
export const PHOTO_RESOURCE_ERRORS = new Set(['PHOTO_STALE', 'PHOTO_RESOURCE_INVALID', 'PHOTO_RESOURCE_UNAVAILABLE'])
