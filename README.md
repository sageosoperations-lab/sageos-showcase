# SageOS — an AI operations agent I run my businesses on

I'm JP Carino. I don't have an engineering title, but for the last several months I've been
designing, deploying and running an AI agent system that does real operating work for me every day:
a job search, a real-estate acquisition pipeline, government-contract sourcing, bookkeeping
reminders and its own maintenance. This repo is a sanitized look at how it is built and, more
importantly, how I keep an autonomous agent **reliable and safe** in front of real money, real
accounts and real people.

The production system is private (it holds business data). Everything here is re-written as small,
self-contained examples with no customer data, credentials or account details.

## What SageOS does

SageOS is a set of AI agents (Claude, orchestrated through the OpenClaw agent gateway) plus more than a hundred
scheduled jobs, one-shot follow-ups and guard scripts. I talk to it in Discord; each business lane has its own
channel, and the agent reports back in plain language.

| Piece | What it does | Example in this repo |
|---|---|---|
| Scheduled agent jobs | Cron-style jobs (morning reports, inbox sweeps, pipeline boards) that run an agent turn and post only the human result | `docs/architecture.md` |
| Promise ledger | Every "next step" the agent says it will do is registered with an owner, a due time and an executor, so nothing is silently dropped | `examples/promise_ledger.mjs` |
| Error loop + circuit breaker | Every failure lands in one ops channel; minor reversible fixes are automatic, anything touching money, auth or outside contact escalates to me; repeated failures open a circuit instead of retrying forever | `examples/circuit_breaker.mjs` |
| Pre-submit gates | Hard checks before any irreversible action (an application, a bid, a sign-in): duplicates, deadlines, qualification gaps, a two-step human approval | `examples/presubmit_gate.mjs`, `examples/login_guard.mjs` |
| Operator surface | A post renderer that forces every message into the same phone-readable shape: status headline, numbered items, a recommendation, and "Your move" last | `examples/post_format.mjs` |

## Design principles (learned the hard way)

1. **Fail closed.** Missing evidence, a missing credential or an unclear approval stops the action
   and produces one concrete blocker, never a guess.
2. **Rules become code.** When I correct the agent, the correction becomes a gate, a test or a hook,
   not just another line in a prompt. Prompts drift; code doesn't.
3. **Humans own the irreversible step.** The agent fills the form, drafts the email and prices the
   bid; I approve, and some actions need a second, separate "send" go.
4. **No silent drops.** Promises are ledgered, failures are routed, and "could not look" is never
   allowed to read as "nothing found".
5. **Cheap by default.** A strong model makes decisions; cheaper models do bulk reading and browser
   work; long jobs run as one-shot scheduled tasks instead of blocking a chat.

## Run the examples

Node 20+ only, no dependencies:

```
node examples/promise_ledger.mjs demo
node examples/circuit_breaker.mjs demo
node examples/presubmit_gate.mjs demo
node examples/login_guard.mjs demo
node examples/post_format.mjs demo
```

## About me

Operator first: sales leadership, construction and real-estate operations, and now building AI
automation that actually ships. I'm interested in roles where I help teams deploy AI agents into
real workflows: discovery, design, guardrails and adoption.
