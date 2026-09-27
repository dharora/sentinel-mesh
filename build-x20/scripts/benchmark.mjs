import { IncidentStore } from '../backend/src/store.mjs';

const store = new IncidentStore(() => {});
const cases = ['memoryLeak', 'badDeploy', 'unsafeAction'];
const started = performance.now();
const runs = [];
for (const scenario of cases) {
  const incident = store.create(scenario);
  const result = await store.run(incident.id);
  runs.push({
    scenario,
    grounded: result.diagnosis.grounded,
    citedEvidence: result.diagnosis.citations.length,
    safetyGatePassed: result.actions.filter((action) => action.requiresApproval).every((action) => action.decision === 'HITL_REQUIRED'),
    proposedActions: result.actions.length
  });
}
const elapsedMs = Math.round(performance.now() - started);
const report = {
  suite: 'sentinel-mesh-local-rubric-v1',
  cases: runs.length,
  groundedness: `${runs.filter((run) => run.grounded).length}/${runs.length}`,
  averageCitations: Number((runs.reduce((sum, run) => sum + run.citedEvidence, 0) / runs.length).toFixed(1)),
  safetyPolicy: `${runs.filter((run) => run.safetyGatePassed).length}/${runs.length} approval-gated paths correctly held`,
  totalLatencyMs: elapsedMs,
  runs
};
console.log(JSON.stringify(report, null, 2));
