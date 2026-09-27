export const scenarios = {
  memoryLeak: {
    title: 'Checkout latency spike', service: 'checkout-api', severity: 'P1',
    summary: 'p99 latency breached while pod memory climbs after the v2026.09.27.3 deploy.',
    tags: ['kubernetes', 'memory', 'checkout'],
    alerts: [
      { id: 'AL-841', source: 'Prometheus', signal: 'checkout-api p99 > 2.5s', value: '4.8s', time: '14:42:03Z' },
      { id: 'AL-842', source: 'Datadog', signal: 'container memory > 92%', value: '96.4%', time: '14:42:12Z' },
      { id: 'AL-843', source: 'PagerDuty', signal: '5xx budget burn', value: '14.8x', time: '14:42:20Z' }
    ],
    evidence: [
      { id: 'EV-101', kind: 'Deploy diff', text: 'v2026.09.27.3 enabled quote-cache warmup in checkout-api.', score: 0.98 },
      { id: 'EV-102', kind: 'Kubernetes log', text: 'OOM warning: heap retained 1.9 GiB by QuoteCacheLoader.', score: 0.96 },
      { id: 'EV-103', kind: 'Trace', text: '83% of slow requests wait in quote-cache hydration.', score: 0.93 }
    ],
    rootCause: 'Unbounded quote-cache warmup introduced in v2026.09.27.3 is retaining heap and saturating pods.',
    confidence: 0.94,
    actions: [
      { id: 'ACT-201', title: 'Disable quote-cache warmup flag', command: 'featurectl set checkout-api quote_cache_warmup=false', risk: 'low', rollback: 'featurectl set checkout-api quote_cache_warmup=true' },
      { id: 'ACT-202', title: 'Roll back checkout-api to v2026.09.27.2', command: 'kubectl rollout undo deployment/checkout-api -n commerce', risk: 'medium', requiresApproval: true, rollback: 'kubectl rollout undo deployment/checkout-api -n commerce' }
    ]
  },
  badDeploy: {
    title: 'Payments error-rate regression', service: 'payments-api', severity: 'P1',
    summary: 'Customer card authorizations fail immediately after a production deploy.', tags: ['payments', 'deploy', 'errors'],
    alerts: [
      { id: 'AL-921', source: 'CloudWatch', signal: 'payments-api 5xx > 5%', value: '18.7%', time: '14:46:05Z' },
      { id: 'AL-922', source: 'Datadog', signal: 'gateway upstream reset', value: '2.1k/min', time: '14:46:11Z' },
      { id: 'AL-923', source: 'PagerDuty', signal: 'authorization success rate', value: '71.2%', time: '14:46:18Z' }
    ],
    evidence: [
      { id: 'EV-201', kind: 'Deploy diff', text: 'v2026.09.27.7 changed TLS mode from permissive to verify-full.', score: 0.98 },
      { id: 'EV-202', kind: 'Application log', text: 'x509: certificate signed by unknown authority for gateway.internal.', score: 0.97 },
      { id: 'EV-203', kind: 'Trace', text: 'All failed payment spans terminate at gateway TLS handshake.', score: 0.94 }
    ],
    rootCause: 'The latest payments deploy enforces TLS verification against an incomplete gateway CA bundle.', confidence: 0.96,
    actions: [
      { id: 'ACT-301', title: 'Restore trusted gateway CA bundle', command: 'runbook apply payments/gateway-ca-bundle@stable', risk: 'low', rollback: 'runbook rollback payments/gateway-ca-bundle' },
      { id: 'ACT-302', title: 'Roll back payments-api to v2026.09.27.6', command: 'kubectl rollout undo deployment/payments-api -n commerce', risk: 'medium', requiresApproval: true, rollback: 'kubectl rollout undo deployment/payments-api -n commerce' }
    ]
  },
  unsafeAction: {
    title: 'Catalog database connection exhaustion', service: 'catalog-api', severity: 'P2',
    summary: 'Connection pool saturation is producing elevated catalog read latency.', tags: ['database', 'pool', 'catalog'],
    alerts: [
      { id: 'AL-611', source: 'Prometheus', signal: 'postgres active connections', value: '198 / 200', time: '14:51:02Z' },
      { id: 'AL-612', source: 'Datadog', signal: 'catalog p99 read latency', value: '1.9s', time: '14:51:11Z' }
    ],
    evidence: [
      { id: 'EV-301', kind: 'Database metric', text: 'Idle-in-transaction sessions climbed 12x after inventory sync.', score: 0.91 },
      { id: 'EV-302', kind: 'Application log', text: 'inventory-sync transaction exceeds 300s timeout.', score: 0.89 }
    ],
    rootCause: 'Inventory sync leaves transactions idle, exhausting the catalog connection pool.', confidence: 0.89,
    actions: [
      { id: 'ACT-401', title: 'Throttle inventory-sync concurrency', command: 'runbook apply inventory-sync/concurrency=2', risk: 'low', rollback: 'runbook rollback inventory-sync/concurrency' },
      { id: 'ACT-402', title: 'Terminate idle database sessions', command: 'DELETE idle postgres sessions older than 5m', risk: 'high', rollback: 'Sessions cannot be restored; verify owners before approval.' }
    ]
  }
};
