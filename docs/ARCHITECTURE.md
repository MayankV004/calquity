# ParcelPilot Customer Support Agent — Architecture

## 1. System overview

```
                 ┌──────────────────────┐
customer ──chat──▶   Next.js chat UI     │
                 └──────────┬───────────┘
                            │ session { account_id, role: "customer" }
                            ▼
                 ┌──────────────────────┐
                 │   Agent orchestrator  │  (tool-calling loop)
                 │  - reasoning/planning │
                 │  - confidence scoring │
                 │  - escalation logic   │
                 └───┬───────┬───────┬───┘
                     │       │       │
         ┌───────────┘       │       └────────────┐
         ▼                   ▼                    ▼
 search_documents    query_account_data    create_escalation
 (pgvector store +   (PostgreSQL DB,       (mocked, requires
  authority meta)     scoped by account_id)  explicit confirm)
```

The orchestrator never receives raw account_id-unscoped data — every tool enforces scoping
itself, so a prompt-injection or reasoning error in the model cannot leak cross-account data.

## 2. Agent design

- **Pattern:** single agent, tool-calling loop (plan → call tool → observe → decide next step or
  answer), not a multi-agent graph — the task doesn't need parallel specialized agents, and a
  single loop is easier to reason about and demo under time constraints.
- **Loop shape per turn:**
  1. Read user message + session context (`account_id`).
  2. Model decides: answer directly, call a tool, or ask a clarifying question.
  3. On tool call, tool executes with `account_id` injected server-side (not by the model).
  4. Tool result returned to the model; loop continues until the model either answers,
     proposes an escalation (awaiting confirmation), or determines it cannot help
     (→ escalate).
  5. Every direct answer is required to cite the specific source(s) used.
- **Stop conditions:** answer with citation + confidence tag, OR escalation proposal awaiting
  confirmation, OR (rare) a clarifying question back to the user if the request is genuinely
  ambiguous (e.g. "which order?").

## 3. Tool design

### 3.1 `search_documents(query, top_k)`
- Retrieves from the 6 supplied documents, chunked and embedded.
- Stored in a PostgreSQL `document_chunks` table using the `pgvector` extension.
- Each chunk carries metadata in relational columns: `{ doc_id, doc_type, status: current|deprecated, effective_date, scope: general|account-specific, account_id? }`.
- Vector similarity search (`<=>` cosine distance operator) is executed directly alongside SQL `WHERE` clauses for `account_id` and document status.
- Retrieval re-ranks by authority, not just similarity: account-specific agreement chunks for the requesting account outrank general policy; `CURRENT` outranks `DEPRECATED` deterministically (deprecated docs are filtered out of default retrieval, only surfaced if the model explicitly needs to explain a policy *change*).
- Returns chunks + metadata so the model can cite and reason about conflicts explicitly.

### 3.2 `query_account_data(account_id, entity, filters)`
- Structured lookup over the account/order/ticket tables loaded from the xlsx workbook into PostgreSQL at startup/ingestion.
- `account_id` is bound server-side from the session — the model can query "my orders" but cannot pass an arbitrary `account_id` and get another account's data. This is the actual access-control enforcement point, not a prompt instruction.
- Also does simple calculations needed for SLA/service-credit logic (e.g. hours late, whether a threshold in the SOP is exceeded) rather than leaving arithmetic to the model.

### 3.3 `create_escalation(ticket_ref, reason, summary)`
- Mocked — writes to an `escalations` table in PostgreSQL, no real ticketing integration.
- Two-phase: `propose_escalation` (returns a draft object shown to the user) → `confirm_escalation` (only fires after the user explicitly confirms in the same conversation turn or the next one).
- The UI renders the draft as a distinct card the user must approve — this is enforced in the UI/API layer (the confirm endpoint requires an explicit `confirmed: true` flag tied to a specific proposal id), not just by asking the model to "wait for confirmation."

## 4. Document and structured-data handling

- **Documents → chunks:** semantic chunking (few-hundred-token chunks with overlap), embedded at ingestion time, stored in PostgreSQL with the `pgvector` extension and HNSW/IVFFlat indexing.
- **Authority metadata is hand-tagged per source file** (not inferred by the model at query time) since there are 6 documents — this is the highest-leverage, lowest-risk way to get reliable conflict handling with limited time.
- **Structured data → PostgreSQL:** the xlsx workbook (accounts, orders, tickets) is loaded once into normalized PostgreSQL tables at build/startup. All time-based logic reads the README's snapshot timestamp as "now," not `Date.now()`.
- **Historical tickets** are retrievable as context (e.g. "similar past issue") but are tagged `advisory_only: true` and the model is instructed (and the UI visually indicates) that these are not policy sources.

## 5. Source reliability & conflict handling

Fixed precedence order, applied deterministically wherever sources disagree:

1. Customer-specific agreement (for the requesting account only)
2. Current general policy / current SOP
3. Product Ops Guide / Known Issues (for product-issue context)
4. Deprecated policy (only referenced to explain a change, never as the basis for an answer)
5. Historical ticket resolutions (context only, explicitly non-authoritative)

When two applicable sources at the *same* level conflict, or the applicable source doesn't clearly cover the situation, the agent does not guess — it escalates and states what it found and why it wasn't sufficient. This logic is detailed in `RULES.md`.

## 6. Access control

- Session carries `{ account_id, role: "customer" }`, set at "login" (mocked).
- `query_account_data` and any document metadata filtered by `account_id` enforce scoping server-side inside the tool implementation — the LLM cannot bypass this by being asked to "ignore instructions" because the enforcement isn't an instruction, it's a parameter the tool binds itself before querying the database.
- No tool accepts a client- or model-supplied `account_id` for `query_account_data`; it's always taken from the authenticated session.

## 7. Confirmation flow (state-changing actions)

- `create_escalation` is split into propose/confirm as described in §3.3.
- The API rejects a `confirm_escalation` call that doesn't reference a still-pending, matching proposal id from the same session — prevents replay/accidental double-fire and keeps the "confirmation" meaningful rather than cosmetic.

## 8. Major technical trade-offs

| Decision | Trade-off accepted |
|---|---|
| Single agent loop, not multi-agent | Simpler to build/debug/demo in the time available; loses some separation-of-concerns a planner/executor split would give |
| Hand-tagged document authority metadata | Fast and reliable for 6 known documents; wouldn't scale to hundreds of documents without an automated tagging pipeline |
| PostgreSQL + `pgvector` store | Highly scalable and production-ready; requires setting up a database connection string (`DATABASE_URL`) on host services like Vercel + Neon/Supabase |
| Mocked auth/action tool | Lets the demo focus on agent reasoning and access-control *pattern* rather than integration plumbing |
| Escalate-on-uncertainty bias | Fewer directly-answered queries than a more "confident" bot, but much lower risk of a wrong customer-facing answer — matches the PRD's chosen success metric |

