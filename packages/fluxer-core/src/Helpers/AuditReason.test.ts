import { describe, expect, it } from 'vitest';
import { AUDIT_LOG_REASON_HEADER, auditReasonHeaders } from './AuditReason.js';

describe('auditReasonHeaders', () => {
  it('returns no keys when reason is omitted, null, or empty', () => {
    expect(auditReasonHeaders()).toEqual({});
    expect(auditReasonHeaders(null)).toEqual({});
    expect(auditReasonHeaders('')).toEqual({});
  });

  it('sends X-Audit-Log-Reason percent-encoded', () => {
    expect(auditReasonHeaders('spam')).toEqual({
      headers: { [AUDIT_LOG_REASON_HEADER]: 'spam' },
    });
    expect(auditReasonHeaders('cool down')).toEqual({
      headers: { [AUDIT_LOG_REASON_HEADER]: 'cool%20down' },
    });
    expect(auditReasonHeaders('café')).toEqual({
      headers: { [AUDIT_LOG_REASON_HEADER]: 'caf%C3%A9' },
    });
  });
});
