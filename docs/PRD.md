# ParcelPilot Customer Support Agent — PRD

## 1. Overview

A customer-facing AI chatbot for ParcelPilot, a B2B logistics platform. Customers ask about
account entitlements, contract terms, shipment cancellations, service credits, and support SLAs.
The bot answers confidently from the supplied data pack when it can, escalates to a human when
it can't, and never leaks data belonging to another account.

**Primary user:** an authenticated customer contact at a business account (e.g. Northstar
Logistics, LumenWorks) chatting about their own shipments/orders.

**Secondary "user" (system):** the escalation queue the bot hands off to when a request needs
human judgment.

## 2. Goals

- Resolve routine, source-backed queries (policy questions, cancellation eligibility, service
  credit eligibility, SLA questions) without human involvement.
- Correctly apply the right layer of policy: customer-specific agreement > current general
  policy > deprecated policy > historical ticket precedent (never authoritative on its own).
- Never answer with unjustified confidence. Escalate anything ambiguous, contract-exception-y,
  or outside the bot's data/tool coverage.
- Strictly scope every customer to their own account's data.

## 3. Non-goals

- No write access to shipments/carriers — the only state-changing action is escalation
  (or ticket-related follow-up), which is mocked.
- No multi-account or admin views — this is single-account, customer-only.
- No fine-tuning / custom model training — off-the-shelf LLM + tools + retrieval only.
- No full identity/auth system — auth and account context are mocked.

## 4. Functional requirements (mapped to assessment minimums)

| # | Requirement | How this PRD addresses it |
|---|---|---|
| 1 | NL chatbot over the data pack only, source-authority-aware | Core chat loop; see Architecture doc §Source Reliability |
| 2 | Access control enforced in data/tool layer | Every tool call is scoped by `account_id` from session context, not by prompt instruction |
| 3 | 3+ distinct tools | `search_documents`, `query_account_data`, `create_escalation` |
| 4 | Confirmation before state-changing actions | `create_escalation` always returns a draft; execution requires explicit user "yes" |
| 5 | Multi-step requests | Agent loop chains tools (order → account → agreement → policy → calc → decision) |
| 6 | Chat interface, tool use visible | Chat UI with a "tool trace" strip per message |
| 7 | Demo video | Recorded after core flows are stable |

## 5. Additional problem chosen: Trust & Reliability (Problem 2)

Rationale: this is a customer-facing system — a confidently wrong answer to a paying customer
is the single worst outcome for adoption. Concretely this means:

- Every factual claim is traceable to a specific source (doc + section, or a specific
  account/order/ticket record).
- The bot explicitly flags when sources conflict (e.g. deprecated policy vs current policy,
  or general policy vs the customer's own agreement) and states which one it applied and why.
- The bot assigns an internal confidence level per answer; below-threshold confidence routes to
  escalation instead of a guessed answer.
- Historical ticket resolutions are usable as *context* only — never cited as policy, flagged
  as "past resolution, not a guarantee" if surfaced at all.

## 6. Assumptions

- Customer identity/account context is mocked via a login-free "select your account" step or a
  hardcoded session (documented clearly as mocked, not a real auth bypass).
- Dataset snapshot time = the time stated in the workbook's README sheet; all "today"/SLA/aging
  calculations use that fixed reference time, not wall-clock time.
- Where the data pack is silent (e.g. an edge-case policy question), the bot escalates rather
  than inventing an answer.
- Additional synthetic data may be added (per the assignment's own allowance) if it makes the
  demo materially more complete — must be clearly labeled as added, not part of the original pack.

## 7. Out of scope for this submission (state explicitly in the Product Note)

- Internal ops chatbot / proactive issue dashboard (Problem 1) — not built in this pass.
- Real authentication, payments, carrier integrations.
- Multi-turn memory persistence across sessions (single-session context is enough for the demo).

## 8. Success metric

**Escalation precision at controlled recall**, i.e. of the queries the bot answers directly
(does not escalate), what fraction are correct/well-justified — while keeping "should have
escalated but didn't" as close to zero as possible. A customer-facing agent is judged more by
the cost of a wrong direct answer than by how many questions it can technically answer, so this
metric is favored over raw resolution rate.

## 9. Example flows to validate against (from the assessment)

- "Can Northstar cancel ORD-1001 without a cancellation fee? Explain why." — must chain: order →
  account → Northstar's enterprise agreement → cancellation SOP → decision + citation.
- "A pickup is three hours late because of carrier fault. Should I get a service credit?" —
  must chain: order/ticket lookup → SLA/service-credit SOP → agreement overrides → decision.
- The system must generalize to *other* records/questions from the same source pack, not just
  these two — no hardcoded IDs or answers.
