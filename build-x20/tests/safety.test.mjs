import test from 'node:test';
import assert from 'node:assert/strict';
import { assessSafety } from '../backend/src/safety.mjs';

test('blocks destructive mutations behind HITL', () => {
  const result = assessSafety({ command: 'kubectl delete pod checkout-123' });
  assert.equal(result.requiresApproval, true); assert.equal(result.decision, 'HITL_REQUIRED');
});
test('permits a bounded reversible runbook', () => {
  const result = assessSafety({ command: 'featurectl set api cache=false' });
  assert.equal(result.requiresApproval, false); assert.equal(result.decision, 'AUTO_APPROVED');
});
