import test from 'node:test';
import assert from 'node:assert/strict';
import { groundDiagnosis } from '../backend/src/grounding.mjs';

test('refuses a root-cause claim without independent evidence', () => {
  const result = groundDiagnosis({ claim: 'a deploy broke production', confidence: 0.99, evidence: [{ id: 'EV-1', kind: 'log' }], citationIds: ['EV-1'] });
  assert.equal(result.grounded, false);
  assert.match(result.rootCause, /Insufficient/);
});

test('publishes a claim only when citations resolve across sources', () => {
  const result = groundDiagnosis({ claim: 'cache leak', confidence: 0.93, evidence: [{ id: 'EV-1', kind: 'log' }, { id: 'EV-2', kind: 'trace' }], citationIds: ['EV-1', 'EV-2'] });
  assert.equal(result.grounded, true);
  assert.equal(result.citations.length, 2);
});
