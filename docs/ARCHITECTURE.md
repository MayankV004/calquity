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

- **Pattern:** single agent, tool-calling loop (plan → call tool → observe → decide next step or answer).
- **Loop shape per turn:**
  1. Read user message + session context (`account_id`).
  2. Model decides: answer directly, call a tool, or ask a clarifying question.
  3. On tool call, tool executes with `account_id` injected server-side (not by the model).
  4. Tool result returned to the model; loop continues until the model either answers, proposes an escalation (awaiting confirmation), or determines it cannot help (→ escalate).
  5. Every direct answer is required to cite the specific source(s) used.
- **Stop conditions:** answer with citation + confidence tag, OR escalation proposal awaiting confirmation, OR clarifying question back to user.

## 3. Tool design

### 3.1 `search_documents(query, top_k)`
- Retrieves from policy documents, chunked and embedded.
- Stored in a PostgreSQL `document_chunks` table using the `pgvector` extension.
- Each chunk carries metadata: `{ doc_id, doc_type, status: current|deprecated, effective_date, scope: general|account-specific, account_id? }`.
- Vector similarity search (`<=>` cosine distance operator) is executed directly alongside SQL `WHERE` clauses for `account_id` and document status.

### 3.2 `query_account_data(account_id, entity, filters)`
- Structured lookup over accounts, orders, and tickets tables loaded into PostgreSQL.
- `account_id` is bound server-side from the session.

### 3.3 `create_escalation(ticket_ref, reason, summary)`
- Writes to `escalations` table in PostgreSQL. Two-phase propose $\rightarrow$ confirm flow.

---

## 9. Production Architecture & Persistence Blueprint

To transition from local/client development to a enterprise **Production Environment**, the following architectural steps should be implemented:

```
[ Client Browser ] 
       │ (HTTPS / WSS)
       ▼
[ Vercel Edge / API Gateway ] ──(JWT Validation)──▶ [ Next.js App Router API Node ]
                                                             │
            ┌────────────────────────────────────────────────┼────────────────────────────────┐
            ▼                                                ▼                                ▼
[ Upstash Redis (Session & Rate Limit) ]    [ Neon PostgreSQL (Drizzle ORM) ]      [ LLM Model Gateway / HF Router ]
  - Rate limiting (Token Bucket)              - `chat_sessions` & `chat_messages`    - NVIDIA Nemotron 3 Ultra
  - Active WebSocket connections              - `accounts`, `orders`, `tickets`      - Automatic OpenAI / Claude Fallback
                                              - `document_chunks` (pgvector HNSW)
```

### Step 1: Server-Side Database Session Persistence
- **Schema Addition:** Create `chat_sessions` (`id`, `account_id`, `user_id`, `created_at`) and `chat_messages` (`id`, `session_id`, `role`, `content`, `tool_traces`, `confidence`, `created_at`) in Neon Postgres via Drizzle ORM.
- **API Endpoint:** Expose `GET /api/chat/history?session_id=...` to load and restore full conversation trajectories seamlessly across devices and browser reloads.

### Step 2: Authentication & RLS Authorization
- Replace client-side account tab selection with JWT-based authentication (e.g. Clerk / Auth0 / NextAuth).
- Enable PostgreSQL **Row-Level Security (RLS)** policies so `WHERE account_id = current_setting('app.current_account_id')` is enforced at the database driver level.

### Step 3: Vector DB Scaling & HNSW Indexing
- Add an `HNSW` vector index on `document_chunks(embedding vector_cosine_ops)` to ensure sub-10ms vector similarity search over millions of chunks.
- Implement an automated CDC (Change Data Capture) or webhook pipeline that auto-embeds new customer contracts uploaded to AWS S3 / Cloud Storage into Neon `pgvector`.

### Step 4: Enterprise LLM Fallback & Caching
- Implement semantic caching via Upstash Redis for recurring policy questions (e.g., general SOP cancellation windows), cutting LLM latency by 80%.
- Implement multi-provider fallback strategy (`NVIDIA Nemotron 3 Ultra` $\rightarrow$ `GPT-4o` $\rightarrow$ `Claude 3.5 Sonnet`) to guarantee 99.99% uptime.
