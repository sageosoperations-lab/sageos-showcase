#!/usr/bin/env node
// Sign-in guard (simplified from SageOS).
//
// Why it exists: a browser agent once pressed Enter on a login form whose saved-password autofill had
// silently failed, adding a failed attempt to an account that was already close to lockout. A prompt
// rule did not stop the next agent; code does:
//   1. never submit a login form with an empty password field (only the field's LENGTH is read;
//      the value never leaves the page and is never logged);
//   2. after two failures on a site within 7 days, no third try until the operator clears it.

const STRIKE_LIMIT = 2;
const WINDOW_MS = 7 * 24 * 3600_000;
const strikes = []; // production: an append-only log file

export function loginAllowed(site, now = Date.now()) {
  const recent = strikes.filter(s => s.site === site && now - s.at < WINDOW_MS && !s.cleared);
  return recent.length >= STRIKE_LIMIT
    ? { ok: false, reason: `${site} failed ${recent.length} times this week; the operator must clear it first` }
    : { ok: true, strikes: recent.length };
}

export function recordFailure(site, why, now = Date.now()) {
  strikes.push({ site, why, at: now });
}

export function clear(site) {
  for (const s of strikes) if (s.site === site) s.cleared = true;
}

// In production this runs inside the page through the browser driver.
export function passwordFilled(passwordFieldValueLength) {
  return passwordFieldValueLength > 0 ? { ok: true } : { ok: false, reason: 'password field is empty; autofill did not run' };
}

export function guardSubmit(site, passwordFieldValueLength) {
  const a = loginAllowed(site);
  if (!a.ok) return a;
  return passwordFilled(passwordFieldValueLength);
}

if (process.argv[2] === 'demo') {
  console.log('empty field      ->', guardSubmit('bank.example', 0));
  recordFailure('bank.example', 'wrong password');
  recordFailure('bank.example', 'wrong password');
  console.log('after 2 failures ->', guardSubmit('bank.example', 12));
  clear('bank.example');
  console.log('operator cleared ->', guardSubmit('bank.example', 12));
}
