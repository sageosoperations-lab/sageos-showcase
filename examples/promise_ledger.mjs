#!/usr/bin/env node
// Promise ledger (simplified from SageOS).
//
// Problem: an AI agent says "Next: I'll draft the follow-up" and then the conversation ends.
// Nobody comes back. Fix: every next step the agent names, and does not finish in the same turn,
// is registered with an owner lane, a due time and an executor. A scheduler fires a follow-up at the
// due time; a sweep escalates anything still open after its follow-up. Nothing is dropped silently.

const ledger = new Map();
let seq = 0;

export function add({ lane, what, dueInMinutes, executor = 'followup', now = Date.now() }) {
  if (!lane || !what) throw new Error('a promise needs a lane and a plain-words step');
  if (!(dueInMinutes > 0)) throw new Error('a promise needs a future due time');
  const id = `p${++seq}`;
  ledger.set(id, { id, lane, what, executor, due: now + dueInMinutes * 60_000, status: 'open', notes: [] });
  return id;
}

export function close(id, how) {
  const p = ledger.get(id);
  if (!p) throw new Error(`unknown promise ${id}`);
  if (!how) throw new Error('closing needs one line saying what was delivered');
  Object.assign(p, { status: 'closed', how });
}

// What the scheduler's sweep does every quarter hour.
export function sweep(now = Date.now()) {
  const actions = [];
  for (const p of ledger.values()) {
    if (p.status !== 'open' || p.due > now) continue;
    const overdueMin = Math.round((now - p.due) / 60_000);
    if (!p.followupFired) {
      p.followupFired = true;
      actions.push({ id: p.id, action: 'fire follow-up', lane: p.lane, what: p.what });
    } else if (overdueMin >= 60) {
      actions.push({ id: p.id, action: 'escalate to ops', lane: 'ops', what: p.what });
    }
  }
  return actions;
}

if (process.argv[2] === 'demo') {
  const t0 = Date.now();
  const a = add({ lane: 'job-hunt', what: 'Post the filled application for review', dueInMinutes: 30, now: t0 });
  const b = add({ lane: 'acq', what: 'Send the weekly pipeline board', dueInMinutes: 10, now: t0 });
  console.log('t+15m sweep:', sweep(t0 + 15 * 60_000));
  close(b, 'Posted the weekly board');
  console.log('t+45m sweep:', sweep(t0 + 45 * 60_000));
  console.log('t+120m sweep:', sweep(t0 + 120 * 60_000));
  console.log('open:', [...ledger.values()].filter(p => p.status === 'open').map(p => p.what));
  void a;
}
