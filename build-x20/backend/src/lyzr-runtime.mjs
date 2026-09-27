import { readFile } from 'node:fs/promises';

/** Thin bridge for an exported Lyzr LAO workflow. Local deterministic fixtures
 * remain available for reproducible demos and tests without credentials. */
export async function invokeLyzrWorkflow(incident) {
  const endpoint = process.env.LYZR_WORKFLOW_RUN_URL;
  const workflowPath = process.env.LYZR_WORKFLOW_JSON_PATH;
  if (!endpoint || !workflowPath) return { mode: 'local-deterministic' };
  const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));
  // Each LAO invocation must get a unique run name for trace correlation.
  workflow.run_name = `sentinel-${incident.id}-${Date.now()}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(process.env.LYZR_API_KEY ? { 'x-api-key': process.env.LYZR_API_KEY } : {}) },
    body: JSON.stringify({ workflow_data: workflow, inputs: { incident_context: incident } })
  });
  if (!response.ok) throw new Error(`Lyzr workflow returned ${response.status}`);
  return { mode: 'lyzr', result: await response.json() };
}
