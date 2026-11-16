#!/usr/bin/env node
// Repeated-failure circuit breaker (simplified from SageOS's error loop).
//
// Rules:
// - Never rerun a materially unchanged failed task.
// - One bounded retry, only for a concrete transient cause (timeout, rate limit, 5xx).
// - Two matching failures, or one integrity / permission / approval failure, open the circuit:
//   stop, keep the evidence, report one concrete blocker.
// - While open, only a paced "half-open" probe runs; a pass closes the circuit, a failure reopens it
//   with a longer backoff.

const TRANSIENT = /timeout|rate.?limit|ECONNRESET|5\d\d/i;
const HARD = /permission|unauthori[sz]ed|integrity|approval|schema/i;

export class Circuit {
  constructor(name, { baseBackoffMin = 15 } = {}) {
    Object.assign(this, { name, state: 'closed', failures: [], backoffMin: baseBackoffMin, openUntil: 0 });
  }

  canRun(now = Date.now()) {
    if (this.state === 'closed') return { ok: true };
    if (now >= this.openUntil) { this.state = 'half-open'; return { ok: true, probe: true }; }
    return { ok: false, reason: `circuit open for ${this.name}: ${this.failures.at(-1)?.cause}` };
  }

  recordSuccess() {
    Object.assign(this, { state: 'closed', failures: [], backoffMin: 15 });
  }

  recordFailure(cause, now = Date.now()) {
    const last = this.failures.at(-1);
    this.failures.push({ cause, at: now });
    const matching = last && last.cause === cause;
    if (this.state === 'half-open' || HARD.test(cause) || matching) {
      if (this.state === 'half-open') this.backoffMin *= 2;
      this.state = 'open';
      this.openUntil = now + this.backoffMin * 60_000;
      return { retry: false, escalate: `One blocker: ${cause}` };
    }
    return { retry: TRANSIENT.test(cause), escalate: null };
  }
}

if (process.argv[2] === 'demo') {
  const c = new Circuit('inbox-sweep');
  const t = Date.now();
  console.log('1st timeout   ->', c.recordFailure('timeout reading mailbox', t));
  console.log('2nd timeout   ->', c.recordFailure('timeout reading mailbox', t + 1));
  console.log('run now?      ->', c.canRun(t + 60_000));
  console.log('after backoff ->', c.canRun(t + 16 * 60_000));
  c.recordSuccess();
  console.log('probe passed  ->', c.state);
  console.log('auth failure  ->', new Circuit('drive').recordFailure('permission denied on folder'));
}
