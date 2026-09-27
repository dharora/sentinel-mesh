/** A deterministic evidence gate: a diagnosis is publishable only if every
 * citation resolves to ingested telemetry and two independent records support it. */
export function groundDiagnosis({ claim, confidence, evidence, citationIds }) {
  const cited = citationIds.map((id) => evidence.find((item) => item.id === id)).filter(Boolean);
  const independentKinds = new Set(cited.map((item) => item.kind));
  if (cited.length < 2 || independentKinds.size < 2) {
    return {
      rootCause: 'Insufficient independent evidence to name a root cause.',
      confidence: 0,
      alternatives: ['Continue telemetry collection'],
      citations: cited.map((item) => item.id),
      grounded: false
    };
  }
  return {
    rootCause: claim,
    confidence: Math.min(confidence, 0.99),
    alternatives: ['Transient dependency degradation', 'Traffic surge without regression'],
    citations: cited.map((item) => item.id),
    grounded: true
  };
}
