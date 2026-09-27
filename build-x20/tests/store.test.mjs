import test from 'node:test';
import assert from 'node:assert/strict';
import { IncidentStore } from '../backend/src/store.mjs';

test('governed pipeline yields cited diagnosis and waits for action approval', async () => {
  const store = new IncidentStore(() => {});
  const incident = store.create('unsafeAction');
  const result = await store.run(incident.id);
  assert.equal(result.status, 'awaiting_approval');
  assert.equal(result.diagnosis.confidence, 0.89);
  assert.equal(result.diagnosis.citations.length, 2);
  assert.equal(result.actions.find((action) => action.id === 'ACT-402').requiresApproval, true);
});

test('approval is recorded as an auditable decision', () => {
  const store = new IncidentStore(() => {});
  const incident = store.create('memoryLeak');
  const result = store.decide(incident.id, 'ACT-202', 'approve', 'incident commander');
  assert.equal(result.actions.find((action) => action.id === 'ACT-202').status, 'approved');
  assert.match(result.timeline.at(-1).detail, /incident commander/);
});
