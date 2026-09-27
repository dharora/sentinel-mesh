# Create the Lyzr workflow in Studio

Do not hand-author a production LAO workflow JSON. Build it in Agent Studio and use **Export JSON** / **Workflow API** so Lyzr generates the dependency graph and agent configuration correctly.

1. Create the three agents from the contracts in `configs/`, all sharing `prompts/system.md`.
2. Add an `incident_context` input node.
3. Connect the agents in order: **Triage → Diagnostic → Remediation**. Pass the preceding output into the following agent.
4. Add a conditional approval node after Remediation for any result marked `requires_human_approval`.
5. Export the generated `workflow_data` JSON into `agents/lyzr-workflow.json`. This filename is intentionally ignored by Git because exported config can contain credentials.
6. Set `LYZR_WORKFLOW_RUN_URL=https://lao.studio.lyzr.ai/run-dag/` and `LYZR_WORKFLOW_JSON_PATH=agents/lyzr-workflow.json` in `.env`.

The backend submits the exported JSON as `workflow_data` and the incident payload as `inputs.incident_context`, matching the Lyzr Workflow API integration model.
