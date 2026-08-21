# ParcelPilot Customer Support Agent — Tech Stack

Chosen for a single deployable app, fast to build and host within the assessment window, using
stacks you're already fluent in.

## Application

- **Framework:** Next.js (App Router), TypeScript — single repo, API routes double as the
  backend, no separate frontend/backend deploy to coordinate.
- **UI:** minimal chat interface, React + Tailwind. Each assistant message renders a small
  "tool trace" chip row (e.g. `search_documents`, `query_account_data`) so tool usage is visibly
  inspectable per the interface requirement.
- **State:** in-memory/session-based; no need for persistent multi-session chat history for the
  demo.

## Agent / LLM layer

- **Model access:** **Hugging Face Inference Endpoints / NVIDIA Nemotron** (e.g. `nvidia/Nemotron-4-340B-Instruct` or `nvidia/Llama-3.1-Nemotron-70B-Instruct`) or OpenAI models via the **Vercel AI SDK** (`createOpenAI` with `https://router.huggingface.co/v1` or `https://api-inference.huggingface.co/v1`).
- **Why Vercel AI SDK:** First-class TypeScript tool-calling, seamless compatibility with Hugging Face Open-API routers and serverless Next.js routes.

## Retrieval

- **Embeddings:** OpenAI or Voyage embeddings.
- **Vector store:** **Neon Postgres with `pgvector` extension**. Document chunks and vector embeddings are stored in a `document_chunks` table using Drizzle ORM's vector column support (`vector`), indexed for fast similarity search (`<=>` cosine distance operator).
- **Metadata:** authority/status/scope fields stored alongside each chunk in relational columns, allowing combined metadata filtering and vector search in a single SQL query.

## Structured data

- **Database & ORM:** **Neon Postgres (`@neondatabase/serverless`) + Drizzle ORM**, loaded once from `ParcelPilot_Assessment_Data.xlsx` via a build-time ingestion script (`xlsx` npm package → normalized tables: `accounts`, `orders`, `tickets`).
- **Access layer:** thin Drizzle query functions that always take `account_id` as a required, server-bound parameter — never optional, never client-suppliable.

## Action tool (mocked)

- A table (`escalations`) in the same PostgreSQL DB. `propose_escalation` inserts a `pending` row; `confirm_escalation` flips it to `confirmed` only given a matching, still-pending id.

## Hosting

- **Deploy target:** Vercel — matches the Next.js choice, free tier is sufficient, gives a public URL with essentially zero DevOps work, satisfies "hosted application" as highly preferred.
- **Secrets:** LLM/embedding API keys and `DATABASE_URL` (Postgres connection string) as Vercel environment variables.

## Dev tooling

- Package manager: pnpm or npm (either fine).
- Testing: light — a handful of scripted example queries (including the two from the assessment plus 3-4 self-authored ones spanning different accounts/records) run manually before recording the demo, rather than a full automated test suite, given the time budget.

## Explicitly not used (and why)

- No separate Python microservice — would cost setup time for no functional benefit here.
- No separate standalone vector DB (Pinecone/Weaviate) — `pgvector` natively integrates vector search within PostgreSQL alongside relational account data, avoiding extra third-party vector DB services.
- No real auth provider (Clerk/Auth0) — mocked session context is sufficient and faster, and is explicitly permitted by the assessment.

