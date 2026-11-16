#!/usr/bin/env node
// Pre-submit gate (simplified from SageOS).
//
// Every irreversible submit (a job application here; bids use a stricter two-step version) runs this
// first. Verdicts: pass, flag (allowed, say why) or block (do not send). A block can only be turned
// into a flag by the operator's quoted words, and some blocks (duplicate, passed deadline) never send.
// Each check exists because of a real miss: a duplicate application, a late submit, the wrong resume.

export function gate(app, { history = [], override = null, today = new Date() } = {}) {
  const findings = [];
  const add = (level, code, why) => findings.push({ level, code, why });

  const dup = history.find(h => h.employer === app.employer && h.title === app.title);
  if (dup) add('never', 'duplicate', `already applied on ${dup.date}`);

  if (app.deadline && new Date(app.deadline) < today) add('never', 'deadline_passed', `closed ${app.deadline}`);

  for (const req of app.requiredCerts || []) {
    if (!(app.candidateCerts || []).includes(req)) add('block', 'min_qual_gap', `posting requires ${req}`);
  }

  if (app.resumeVariant && app.roleFamily && !app.resumeVariant.startsWith(app.roleFamily)) {
    add('block', 'wrong_resume', `resume ${app.resumeVariant} does not match role family ${app.roleFamily}`);
  }

  const missing = (app.requiredLinks || []).filter(l => !app.links?.[l]);
  for (const l of missing) add('block', 'missing_link', `form needs a ${l} link`);

  let verdict = 'pass';
  if (findings.some(f => f.level === 'never')) verdict = 'block';
  else if (findings.some(f => f.level === 'block')) {
    const liftable = findings.every(f => f.level !== 'block' || f.code === 'min_qual_gap');
    verdict = override && liftable ? 'flag' : 'block';
  }
  return { verdict, findings, override: verdict === 'flag' ? override : null };
}

if (process.argv[2] === 'demo') {
  const history = [{ employer: 'Acme', title: 'Ops Analyst', date: '2026-10-02' }];
  const base = { employer: 'Example Co', title: 'Solutions Engineer', roleFamily: 'se', resumeVariant: 'se-ai',
    requiredCerts: ['5 years SaaS'], candidateCerts: [], requiredLinks: ['github'], links: { github: 'set' } };
  console.log('gap, no override  ->', gate(base, { history }).verdict);
  console.log('gap, operator ok  ->', gate(base, { history, override: '"Ship them all."' }).verdict);
  console.log('duplicate         ->', gate({ ...base, employer: 'Acme', title: 'Ops Analyst' }, { history, override: 'yes' }).verdict);
  console.log('missing link      ->', gate({ ...base, links: {} }, { history, override: 'yes' }).findings.map(f => f.code));
}
