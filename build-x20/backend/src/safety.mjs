const destructivePatterns = [
  /\b(delete|drop|reboot|terminate|destroy|wipe)\b/i,
  /kubectl\s+scale.*--replicas\s*=\s*0/i,
  /--force\b/i,
  /rm\s+-rf/i
];

export function assessSafety(action) {
  const command = `${action.command || ''} ${action.title || ''}`;
  const isDestructive = destructivePatterns.some((pattern) => pattern.test(command));
  const requiresApproval = isDestructive || Boolean(action.requiresApproval);
  return {
    risk: isDestructive ? 'high' : action.risk || 'low',
    requiresApproval,
    decision: requiresApproval ? 'HITL_REQUIRED' : 'AUTO_APPROVED',
    reason: isDestructive
      ? 'Destructive infrastructure mutation matched the Safe AI policy.'
      : requiresApproval
        ? 'This operational change is configured as an approval-gated runbook.'
        : 'Reversible action is within the approved runbook catalog.'
  };
}
