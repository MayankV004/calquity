# ParcelPilot AI Support Agent 🚀

A customer-facing, trust-first AI Customer Support Agent application for **ParcelPilot** (B2B Logistics Platform), built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Vercel AI SDK**, and **Neon Postgres with `pgvector`** managed via **Drizzle ORM**.

---

## 🌟 Key Capabilities & Features

1. **Source Authority Hierarchy & Reliability**
   - Strictly applies source precedence: **Customer Agreement (Tier 1)** > **Current SOP (Tier 2)** > **Product Ops Guide (Tier 3)** > **Deprecated Policy (Tier 4)** > **Historical Tickets (Tier 5 Context Only)**.
   - Detects conflicts explicitly (e.g. Northstar Enterprise Agreement overriding standard SOP fee & SLA rules).

2. **Strict Server-Bound Access Control**
   - Access control is enforced at the server & tool layer. Every data query and vector retrieval is hard-scoped to the authenticated session's `account_id`.
   - Prevents cross-account data leakage (e.g. Northstar cannot see LumenWorks data).

3. **Three Core Tools**
   - `search_documents`: `pgvector` similarity search combined with metadata filters (`status`, `account_id`, `scope`).
   - `query_account_data`: Structured SQL queries over `accounts`, `orders`, `tickets` with built-in SLA delay calculations.
   - `create_escalation`: Two-phase state action (`propose` draft $\rightarrow$ explicit user `confirm`).

4. **Modern UI & Visual Tool Trace**
   - Interactive Chat UI with an **Account Context Switcher** (Northstar Logistics, LumenWorks, Beacon Retail).
   - Live **Tool Trace** chips per assistant turn displaying functions called and execution summaries.
   - Interactive **Escalation Proposal Card** requiring user approval.

---

## 📁 Project Structure

```
.
├── app/
│   ├── api/chat/route.ts   # Agent orchestrator & tool reasoning loop
│   ├── page.tsx            # Main Chat UI with Account Switcher & Tool Trace
│   ├── layout.tsx
│   └── globals.css
├── db/
│   ├── index.ts            # Neon Postgres client wrapper
│   └── schema.ts           # Drizzle ORM schema definitions (with pgvector)
├── lib/
│   ├── dataset.ts          # Dataset parser & policy chunk loader
│   └── tools.ts            # Core tools (search_documents, query_account_data, create_escalation)
├── data/policies/          # Candidate Data Pack (PDF policies & Excel dataset)
├── docs/                   # Assessment Documentation
│   ├── ARCHITECTURE.md     # Architecture Note
│   ├── PRD.md              # Product Note (Problem 2: Trust & Reliability)
│   ├── TECH_STACK.md       # Tech Stack breakdown
│   ├── SECURITY.md         # Application security & guardrails
│   └── RULES.md            # Decision rules & authority hierarchy
└── scripts/
    └── ingest.ts           # Data ingestion script for Neon PostgreSQL + pgvector
```

---

## 🚀 Quick Start & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set your environment variables in `.env`:
```env
OPENAI_API_KEY=your-openai-key
DATABASE_URL=postgres://user:password@ep-sample.neon.tech/neondb?sslmode=require
```

### 3. Run Data Ingestion (Optional for Cloud Postgres)
To push structured tables & vectors into your Neon PostgreSQL database:
```bash
npm run db:ingest
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 Submission Deliverables

- 📘 **Architecture Note:** [docs/ARCHITECTURE.md](file:///home/streamliner/calquity/docs/ARCHITECTURE.md)
- 📙 **Product Note:** [docs/PRD.md](file:///home/streamliner/calquity/docs/PRD.md)
- 🛠️ **Tech Stack Details:** [docs/TECH_STACK.md](file:///home/streamliner/calquity/docs/TECH_STACK.md)
- 🔒 **Security & Guardrails:** [docs/SECURITY.md](file:///home/streamliner/calquity/docs/SECURITY.md)
