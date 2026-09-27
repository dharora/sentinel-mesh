const state = { incidents: [], selected: null, events: [] };
const $ = (id) => document.getElementById(id);
const api = async (url, opts = {}) => { const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...opts }); if (!res.ok) throw new Error('Request failed'); return res.json(); };
const time = (iso) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(iso));
const title = (status) => status.replaceAll('_', ' ');

function renderList() {
  $('incident-total').textContent = state.incidents.length;
  $('open-count').textContent = String(state.incidents.length).padStart(2, '0');
  $('incident-list').innerHTML = state.incidents.map(i => `<button class="incident-row ${state.selected?.id === i.id ? 'selected' : ''}" data-id="${i.id}"><span class="severity-dot ${i.severity.toLowerCase()}"></span><div><strong>${i.title}</strong><small>${i.service} · ${i.id}</small></div><span>${i.severity}</span></button>`).join('');
  document.querySelectorAll('.incident-row').forEach(el => el.addEventListener('click', () => select(el.dataset.id)));
}
function statusClass(s) { return s === 'mitigating' ? 'working' : s === 'awaiting_approval' ? 'waiting' : s === 'investigating' ? 'muted' : 'working'; }
function renderIncident() {
  const i = state.selected; if (!i) return;
  $('severity-badge').textContent = i.severity; $('severity-badge').className = `severity ${i.severity.toLowerCase()}`;
  $('service-name').innerHTML = `${i.service} <span>/</span> commerce`; $('incident-title').textContent = i.title; $('incident-summary').textContent = i.summary;
  $('incident-status').textContent = title(i.status).toUpperCase(); $('incident-status').className = `status ${statusClass(i.status)}`;
  $('confidence').textContent = `${Math.round(i.confidence * 100)}% evidence confidence`;
  $('root-cause').textContent = i.diagnosis?.rootCause || 'Analysis has not run yet. Execute the governed pipeline to create a source-cited diagnosis.';
  $('evidence-list').innerHTML = (i.diagnosis ? i.evidence : []).map(e => `<article class="evidence"><span>${e.kind}</span><p>${e.text}</p><b>${e.id} · ${Math.round(e.score * 100)}%</b></article>`).join('') || '<div class="placeholder-lines"><i></i><i></i><i></i></div>';
  $('action-list').innerHTML = i.actions.map(a => `<article class="action ${a.requiresApproval ? 'gated' : ''}"><div class="action-top"><div class="action-icon">${a.requiresApproval ? '⚿' : '✓'}</div><div><strong>${a.title}</strong><small>${a.command}</small></div><span class="risk ${a.risk}">${a.requiresApproval ? 'HITL REQUIRED' : 'REVERSIBLE'}</span></div><div class="action-foot"><span>Rollback: ${a.rollback}</span>${actionControls(a)}</div></article>`).join('');
  $('timeline-list').innerHTML = [...i.timeline].reverse().map((t, n) => `<article class="timeline-event"><div class="timeline-node ${t.status === 'running' ? 'spinning' : ''}">${n === 0 ? '●' : '·'}</div><div><div class="event-meta"><span>${t.agent}</span><time>${time(t.time)}</time></div><strong>${t.label}</strong><p>${t.detail}</p></div></article>`).join('');
  const run = $('run-button'); run.disabled = ['awaiting_approval', 'mitigating'].includes(i.status); run.innerHTML = run.disabled ? 'Analysis complete <span>✓</span>' : 'Run governed analysis <span>→</span>';
  $('blocked-count').textContent = String(state.incidents.flatMap(x => x.actions).filter(a => a.requiresApproval).length).padStart(2, '0');
}
function actionControls(a) {
  if (a.status === 'approved') return '<b class="approved">Approved · queued</b>';
  if (a.status === 'rejected') return '<b class="rejected">Declined</b>';
  if (!a.requiresApproval) return '<b class="safe">Auto-approved by policy</b>';
  return `<span class="approval-buttons"><button class="reject-action" data-action="${a.id}">Decline</button><button class="approve-action" data-action="${a.id}">Approve action</button></span>`;
}
async function select(id) { state.selected = state.incidents.find(i => i.id === id); renderList(); renderIncident(); bindButtons(); }
async function refresh(preferred) { const { incidents } = await api('/api/incidents'); state.incidents = incidents; const id = preferred || state.selected?.id || incidents[0]?.id; state.selected = incidents.find(i => i.id === id) || incidents[0]; renderList(); renderIncident(); bindButtons(); }
function bindButtons() {
  $('run-button').onclick = async () => { $('run-button').disabled = true; toast('Triage, diagnostic, and remediation agents are collaborating…'); await api(`/api/incidents/${state.selected.id}/run`, { method: 'POST', body: '{}' }); await refresh(); toast('Grounded analysis completed. Review the Safe AI gate.'); };
  document.querySelectorAll('.approve-action,.reject-action').forEach(btn => btn.onclick = async () => { const decision = btn.classList.contains('approve-action') ? 'approve' : 'reject'; await api(`/api/incidents/${state.selected.id}/actions/${btn.dataset.action}/${decision}`, { method: 'POST', body: JSON.stringify({ actor: 'on-call engineer' }) }); await refresh(); toast(decision === 'approve' ? 'Approval recorded in the immutable decision trail.' : 'Action declined. No mutation was issued.'); });
}
async function createScenario(scenario) { const { incident } = await api('/api/incidents', { method: 'POST', body: JSON.stringify({ scenario }) }); await refresh(incident.id); toast(`${incident.severity} incident ingested and ready for analysis.`); }
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove('show'), 3800); }
function exportRca() { const i = state.selected; const markdown = `# Blameless RCA — ${i.title}\n\n**Incident:** ${i.id}\n**Service:** ${i.service}\n**Severity:** ${i.severity}\n\n## Root cause\n${i.diagnosis?.rootCause || 'Analysis pending'}\n\n## Evidence\n${i.evidence.map(e => `- ${e.id}: ${e.text}`).join('\n')}\n\n## Prevention\nAdd regression coverage for the implicated deployment path, alert on leading saturation indicators, and validate the runbook in staging.\n`;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' })), download: `${i.id}-rca.md` }); a.click(); URL.revokeObjectURL(a.href); toast('Blameless RCA downloaded.'); }
$('simulate-button').onclick = () => createScenario('badDeploy'); document.querySelectorAll('[data-scenario]').forEach(b => b.onclick = () => createScenario(b.dataset.scenario)); $('download-rca').onclick = exportRca;
const stream = new EventSource('/api/events'); stream.onmessage = () => refresh(); stream.addEventListener('incident.updated', () => refresh()); stream.addEventListener('incident.created', () => refresh());
refresh();
