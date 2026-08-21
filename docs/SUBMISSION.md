# ParcelPilot Customer Support Agent — Assessment Submission & Video Script Guide

This document details the final submission package, application URLs, architecture recap, product decisions, and a 5-minute video demonstration script according to the **CalQuity AI Agent Assessment** guidelines.

---

## 1. Submission Deliverables Summary

1. **Repository:** Public GitHub Repository containing Next.js source code, Drizzle ORM schema, PDF/Excel ingestion pipeline, and decision rules.
2. **Hosted Application:** Deployed on Vercel with Neon PostgreSQL + `pgvector`.
3. **Architecture Note:** Documented in [docs/ARCHITECTURE.md](file:///home/streamliner/calquity/docs/ARCHITECTURE.md).
4. **Product Note:** Documented in [docs/PRD.md](file:///home/streamliner/calquity/docs/PRD.md).
5. **Security & Guardrails:** Documented in [docs/SECURITY.md](file:///home/streamliner/calquity/docs/SECURITY.md).

---

## 2. 5-Minute Demo Video Outline & Script

### Minute 0:00 – 1:00 | Overview & Solution Architecture
- **Intro:** Welcome! Today we are demonstrating the **ParcelPilot AI Support Agent**, built to solve **Problem 2: Trust & Reliability** for customer operations.
- **Tech Stack:** Built using Next.js (App Router), TypeScript, Vercel AI SDK, and Neon PostgreSQL with `pgvector` managed via Drizzle ORM.
- **Data Pack:** Ingests 6 policy PDFs and `ParcelPilot_Assessment_Data.xlsx`.
- **Key Principle:** The LLM is untrusted for access control. Data scoping (`account_id`) is strictly server-bound.

### Minute 1:00 – 2:30 | Core Flow Demonstration
1. **Scenario 1: Cancellation Fee Query with Customer Agreement Override**
   - *Select Context:* **Northstar Logistics** (`ACCT-001`).
   - *Prompt:* "Can Northstar cancel ORD-1001 without a cancellation fee? Explain why."
   - *Demonstrate:* Agent chains tools (`search_documents` $\rightarrow$ `query_account_data`). Shows Northstar Enterprise Agreement override (Tier 1 Authority) granting ₹0 cancellation fee prior to pickup, overriding standard 60-minute SOP rules.
   - *Show Tool Trace:* Highlight the visual tool execution chip row under the message.

2. **Scenario 2: Service Credit & Pickup Delay SLA Calculation**
   - *Prompt:* "A pickup is three hours late on ORD-1001. Should I get a service credit?"
   - *Demonstrate:* Agent calculates 3-hour pickup delay and applies Northstar's custom SLA (>1 hour delay = 100% refund), citing the exact Enterprise Agreement section.

### Minute 2:30 – 3:30 | Access Control & Cross-Account Isolation
1. **Scenario 3: Cross-Account Data Isolation Test**
   - *Action:* While authenticated as **Northstar Logistics** (`ACCT-001`), ask for LumenWorks order `ORD-2001`.
   - *Demonstrate:* The tool layer enforces `WHERE account_id = sessionAccountId` and returns "Order not found or accessible under your account."

### Minute 3:30 – 4:30 | Confirmation Guardrail for Escalations
1. **Scenario 4: Two-Phase Escalation Action**
   - *Prompt:* "I want to talk to a manager and escalate my ticket."
   - *Demonstrate:* Agent invokes `create_escalation('propose')`, rendering an interactive **Escalation Proposal Card** in the UI.
   - *Confirm:* User clicks **Confirm Escalation**. The agent invokes `create_escalation('confirm')`, generating Support Ticket `TKT-682`.

### Minute 4:30 – 5:00 | Trade-Offs & Future Roadmap
- **Trade-Offs:** Single-agent tool loop for deterministic reasoning; hand-tagged authority metadata for 100% precision on conflicts.
- **Evaluation Metric:** **Escalation Precision at Controlled Recall** (minimizing wrong direct answers).

---

## 3. AI Coding Tools Usage Statement

During the development of this application:
- **Antigravity AI Agent** was used for pair programming, architecting the Next.js App Router structure, designing the Drizzle ORM schema, implementing server-bound security tool logic, and generating responsive glassmorphism UI components.
- PDF parsing (`pdf-parse`) and Excel parsing (`xlsx`) were automated via custom TypeScript scripts.
