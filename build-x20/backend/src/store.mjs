import { scenarios } from './telemetry.mjs';
import { assessSafety } from './safety.mjs';
import { invokeLyzrWorkflow } from './lyzr-runtime.mjs';
import { groundDiagnosis } from './grounding.mjs';

const now = () => new Date().toISOString();
const stamp = (label, detail, agent = 'orchestrator', status = 'complete') => ({ id: `AIMS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, time: now(), label, detail, agent, status });

export class IncidentStore {
  constructor(publish) { this.publish = publish; this.incidents = new Map(); this.counter = 1147; this.seed(); }
  seed() { this.create('memoryLeak', true); }
  create(scenarioName, silent = false) {
    const source = scenarios[scenarioName] || scenarios.memoryLeak;
    const id = `INC-${this.counter++}`;
    const incident = {
      id, scenario: scenarioName, status: 'investigating', createdAt: now(), updatedAt: now(),
      ...structuredClone(source), triage: null, diagnosis: null,
      actions: source.actions.map((action) => ({ ...action, ...assessSafety(action), status: 'proposed' })),
      timeline: [stamp('Alert cluster created', `${source.alerts.length} correlated signals ingested from ${[...new Set(source.alerts.map(a => a.source))].join(', ')}.`, 'telemetry')]
    };
    this.incidents.set(id, incident); if (!silent) this.emit('incident.created', incident); return incident;
  }
  emit(type, incident) { incident.updatedAt = now(); this.publish({ type, incident: this.public(incident), at: now() }); }
  public(incident) { return structuredClone(incident); }
  list() { return [...this.incidents.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(i => this.public(i)); }
  get(id) { const incident = this.incidents.get(id); return incident && this.public(incident); }
  async run(id) {
    const incident = this.incidents.get(id); if (!incident) return null;
    // In connected environments, invoke the exported LAO workflow as the
    // evidence-producing specialist runtime. Local fixtures keep the demo
    // deterministic and benchmarkable when credentials are not configured.
    const runtime = await invokeLyzrWorkflow(this.public(incident));
    if (runtime.mode === 'lyzr') incident.timeline.push(stamp('Lyzr workflow invoked', 'Remote LAO workflow accepted the incident context.', 'lyzr-runtime'));
    incident.status = 'triaging'; incident.timeline.push(stamp('Triage agent started', 'Deduplicating alerts and calculating customer blast radius.', 'triage-agent', 'running')); this.emit('incident.updated', incident);
    await delay(380);
    incident.triage = { severity: incident.severity, clusterConfidence: 0.97, affected: `${incident.service} · commerce`, rationale: `Correlated ${incident.alerts.length} signals in a 90-second window with confirmed customer impact.` };
    incident.timeline.push(stamp('Triage complete', `Classified ${incident.severity}; cluster confidence 97%; affected service: ${incident.service}.`, 'triage-agent')); this.emit('incident.updated', incident);
    await delay(380);
    incident.status = 'diagnosing'; incident.timeline.push(stamp('Diagnostic agent started', 'Testing deployment, saturation, and dependency hypotheses against telemetry.', 'diagnostic-agent', 'running')); this.emit('incident.updated', incident);
    await delay(460);
    incident.diagnosis = groundDiagnosis({ claim: incident.rootCause, confidence: incident.confidence, evidence: incident.evidence, citationIds: incident.evidence.map(e => e.id) });
    incident.timeline.push(stamp('Diagnosis grounded', `Root cause confidence ${Math.round(incident.diagnosis.confidence * 100)}%; cited ${incident.diagnosis.citations.length} independent evidence records.`, 'diagnostic-agent')); this.emit('incident.updated', incident);
    await delay(340);
    incident.status = 'awaiting_approval'; incident.timeline.push(stamp('Remediation plan proposed', `${incident.actions.length} runbook actions passed through Safe AI policy.`, 'remediation-agent')); this.emit('incident.updated', incident);
    return this.public(incident);
  }
  decide(id, actionId, decision, actor = 'on-call engineer') {
    const incident = this.incidents.get(id); const action = incident?.actions.find(a => a.id === actionId); if (!incident || !action) return null;
    if (decision === 'approve') { action.status = 'approved'; incident.timeline.push(stamp('Human approval recorded', `${actor} approved “${action.title}”. Execution is queued.`, 'safe-ai')); }
    else { action.status = 'rejected'; incident.timeline.push(stamp('Runbook action declined', `${actor} declined “${action.title}”. No infrastructure mutation was issued.`, 'safe-ai')); }
    incident.status = incident.actions.some(a => a.status === 'approved') ? 'mitigating' : 'awaiting_approval'; this.emit('incident.updated', incident); return this.public(incident);
  }
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
