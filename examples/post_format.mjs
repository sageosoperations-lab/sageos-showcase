#!/usr/bin/env node
// Operator post renderer (simplified from SageOS).
//
// Every message the agent posts is read on a phone by a busy human. So every post has one shape:
// a bold status headline, numbered one-line items, a recommendation for each open choice, and
// "Your move" last. The renderer also refuses machine noise (ids, file paths, JSON, stack traces)
// and markdown tables, which chat apps show as raw pipes.

const NOISE = [
  [/\/(Users|home|var|tmp)\/\S+/, 'a file path'],
  [/^\s*[{[]/m, 'raw JSON'],
  [/\bat \S+ \(.+:\d+:\d+\)/, 'a stack trace'],
  [/^\s*\|.*\|\s*$/m, 'a table row'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, 'an internal id'],
];

export function render({ headline, items = [], recommend, yourMove }) {
  if (!headline) throw new Error('a post needs a status headline');
  if (!yourMove) throw new Error('a post ends with what the human must do ("Your move")');
  const body = [`**${headline}**`, '', ...items.map((t, i) => `${i + 1}. ${t}`)];
  if (recommend) body.push('', `Recommend: ${recommend}`);
  body.push('', `**Your move:** ${yourMove}`);
  const text = body.join('\n');
  for (const [re, what] of NOISE) if (re.test(text)) throw new Error(`post held: it contains ${what}`);
  return text;
}

if (process.argv[2] === 'demo') {
  console.log(render({
    headline: 'Two applications are filled and waiting for your submit',
    items: ['Example Co, Solutions Engineer: every field filled, open in its own window',
      'Sample Inc, Sales Engineer: needs your portfolio link before it can be finished'],
    recommend: 'submit Example Co today; it closes Friday',
    yourMove: 'review the open window and click Submit, or reply "submit Example Co"',
  }));
  try { render({ headline: 'Done', items: ['saved to /Users/someone/file.json'], yourMove: 'none' }); }
  catch (e) { console.log('\n' + e.message); }
}
