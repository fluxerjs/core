/** Fluxer audit-log reason header (docs: Audit reason). */
export const AUDIT_LOG_REASON_HEADER = 'X-Audit-Log-Reason';

/**
 * REST `headers` fragment for mutations labelled Audit reason.
 * Omitted / empty reasons produce no extra keys so existing call-shape tests stay stable.
 */
export function auditReasonHeaders(
  reason?: string | null,
): { headers: Record<string, string> } | Record<string, never> {
  if (reason == null || reason === '') return {};
  return { headers: { [AUDIT_LOG_REASON_HEADER]: encodeURIComponent(reason) } };
}
