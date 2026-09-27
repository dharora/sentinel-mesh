# Sentinel Mesh

**A governed, evidence-first incident response mesh for cloud operations.** It turns noisy Prometheus, Datadog, CloudWatch, and PagerDuty-style signals into a source-cited diagnosis and a safe remediation plan—without granting an agent the power to make an unsafe change autonomously.

## Why this is different

Most incident agents end at a plausible answer. Sentinel Mesh enforces a decision contract:

1. **Triage** only assigns severity after correlation and customer-impact evidence.
2. **Diagnostic** produces a ranked, cited root-cause claim; missing telemetry stays unknown.
3. **Remediation** can select only catalogued actions and must supply a rollback.
4. **Safe AI policy** blocks destructive verbs (`DELETE`, `DROP`, `REBOOT`, forced operations, scale-to-zero) behind an explicit human approval event.
5. Every important transition becomes an append-only, AIMS-style trail that feeds a downloadable blameless RCA.

The dashboard is not a static mockup: its live event stream reflects actual state transitions, safety decisions, and approvals. It starts with deterministic mock telemetry so a judge can reproduce every scenario with no API key, then can point at a deployed Lyzr workflow for live inference.

## Architecture

```text
Alert sources ──> Incident Store ──> Triage Agent ──> Diagnostic Agent ──> Remediation Agent
 Prometheus          (state +              │                   │                    │
 Datadog              SSE)                 └── cited telemetry ─┴── approved catalog  ┘
 PagerDuty                                                                 │
 CloudWatch                                                     Safe AI policy gate
                                                                         │
                                                human approval ──> action log / RCA
```

### Lyzr deployment path

The `agents/` directory separates the agent contracts from the application runtime:

- `configs/` defines the three specialist inputs, outputs, and guardrails.
- `prompts/system.md` is the shared grounding and safety policy.
- `workflow-setup.md` gives the exact Studio graph and export procedure for the triage → diagnose → remediate handoff.

Create the three role-based agents in Lyzr Studio and export the workflow JSON into `agents/lyzr-workflow.json` (it is ignored by Git because exports can include credentials). Configure `LYZR_WORKFLOW_RUN_URL` plus `LYZR_WORKFLOW_JSON_PATH`; the adapter submits the exported graph with the incident as runtime input and never exposes secret material to the browser. See `agents/workflow-setup.md` for the precise Studio steps.

## Run locally

Requirements: Node 20+.

```bash
cp .env.example .env
npm start
```

Open [http://localhost:8787](http://localhost:8787).

No dependency installation is required. Or run the container:

```bash
docker compose up --build
```

## Demo script (90 seconds)

1. Open the command center: the seeded Checkout P1 demonstrates correlated multi-source telemetry.
2. Click **Run governed analysis**. The UI streams each agent handoff into the decision graph.
3. Expand the evidence: every root-cause assertion has an event ID and relevance score.
4. Show the remediation cards: reversible actions are catalogued; rollout changes require sign-off.
5. Click **Safety gate** in the scenario chips, run analysis, and show `DELETE idle postgres sessions` stopped at `HITL REQUIRED`.
6. Approve or decline an action. The decision is written to the audit trail and the RCA can be downloaded.

## Evaluation-ready properties

| Rubric | Evidence in the build |
| --- | --- |
| Lyzr orchestration | Explicit three-agent handoff, typed contracts, shared governance prompt, LAO workflow template |
| DevOps safety | Command-pattern policy, approved-runbook boundary, irreversible-action block, explicit HITL event, rollback display |
| Code quality | Small dependency-free Node service, isolated policy/store/telemetry modules, tests, Docker setup, secret-free config |
| SRE experience | Live incident queue, real-time SSE updates, source-cited diagnosis, action-log trace, downloadable blameless RCA |
| Groundedness | Causal claims are supported by multiple evidence objects with immutable IDs; alternatives and uncertainty are preserved |

## API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/incidents` | Current queue and full incident state |
| `POST` | `/api/incidents` | Ingest a mock scenario (`memoryLeak`, `badDeploy`, `unsafeAction`) |
| `POST` | `/api/incidents/:id/run` | Execute the governed triage → diagnosis → remediation sequence |
| `POST` | `/api/incidents/:id/actions/:actionId/approve` | Record a human approval |
| `POST` | `/api/incidents/:id/actions/:actionId/reject` | Record a human rejection |
| `GET` | `/api/events` | Server-sent state transitions for the dashboard |
| `GET` | `/api/health` | Runtime readiness and Lyzr adapter status |

## Safety model

The policy engine is deliberately deterministic and evaluated before every proposed action. It is a final hard gate, not a prompt instruction. A model may recommend an action, but it cannot bypass `assessSafety`. In a production deployment, approvals should be authenticated, stored durably, and tied to a change-management ticket; this demo persists in memory to remain self-contained.

## Tests

```bash
npm test
```

The included tests prove that destructive mutations require HITL while bounded reversible actions do not. Extend this suite with golden incident traces and adversarial command cases before production rollout.

Run the reproducible local rubric suite with:

```bash
npm run benchmark
```

It measures citation coverage, groundedness gate pass rate, destructive-action gating, and full pipeline latency across all three incident fixtures. This is intentionally a local engineering benchmark—not a claim about production LLM quality—so it can be rerun before submitting a live Lyzr endpoint.

## Repository layout

```text
agents/        Specialist contracts, governance prompt, Lyzr workflow template
backend/       HTTP API, incident state machine, safety policy, telemetry fixtures
frontend/      Responsive command-center dashboard
tests/         Policy regression tests
```
