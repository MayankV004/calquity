import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

export interface AccountData {
  account_id: string;
  account_name: string;
  plan: string;
  status: string;
  csm?: string;
  contract_file?: string;
  premium_support: boolean;
  notes?: string;
}

export interface OrderData {
  order_id: string;
  account_id: string;
  carrier?: string;
  status: string;
  booked_at?: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  pickup_actual_at?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  actual_delivery?: string;
  shipment_fee_inr?: number;
  carrier_fault?: boolean;
  customer_fault?: boolean;
  cancellation_requested_at?: string;
  cancellation_fee_waived?: boolean;
  notes?: string;
}

export interface TicketData {
  ticket_id: string;
  account_id: string;
  order_id?: string;
  created_at?: string;
  status?: string;
  subject?: string;
  description?: string;
  channel?: string;
  assigned_to?: string;
  last_customer_message_at?: string;
  resolution?: string;
  advisory_only: boolean;
}

export interface DocChunk {
  id: string;
  doc_id: string;
  doc_name: string;
  doc_type: string; // 'policy' | 'sop' | 'agreement' | 'product_ops'
  status: 'CURRENT' | 'DEPRECATED';
  effective_date: string;
  scope: 'general' | 'account-specific';
  account_id?: string; // e.g. 'ACCT-001'
  chunk_index: number;
  content: string;
}

export interface IngestedDataset {
  snapshotTime: string;
  accounts: AccountData[];
  orders: OrderData[];
  tickets: TicketData[];
  chunks: DocChunk[];
}

let cachedDataset: IngestedDataset | null = null;

export function getLocalDataset(): IngestedDataset {
  if (cachedDataset) return cachedDataset;

  const dataDir = path.join(process.cwd(), 'data', 'policies');
  const excelPath = path.join(dataDir, 'ParcelPilot_Assessment_Data.xlsx');

  let snapshotTime = '2026-08-16 11:00 Asia/Kolkata';
  let accounts: AccountData[] = [];
  let orders: OrderData[] = [];
  let tickets: TicketData[] = [];

  if (fs.existsSync(excelPath)) {
    const fileBuffer = fs.readFileSync(excelPath);
    const wb = xlsx.read(fileBuffer, { type: 'buffer' });

    if (wb.Sheets['README']) {
      const readmeRows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['README']);
      const snapRow = readmeRows.find((r) => r['ParcelPilot AI Agent Assessment - Structured Data'] === 'Dataset snapshot');
      if (snapRow && snapRow.__EMPTY) {
        snapshotTime = snapRow.__EMPTY;
      }
    }

    if (wb.Sheets['accounts']) {
      const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['accounts']);
      accounts = rows.map((r) => ({
        account_id: String(r.account_id),
        account_name: String(r.account_name || ''),
        plan: String(r.plan || ''),
        status: String(r.status || ''),
        csm: r.csm ? String(r.csm) : undefined,
        contract_file: r.contract_file ? String(r.contract_file) : undefined,
        premium_support: Boolean(r.premium_support),
        notes: r.notes ? String(r.notes) : undefined,
      }));
    }

    if (wb.Sheets['orders']) {
      const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['orders']);
      orders = rows.map((r) => ({
        order_id: String(r.order_id),
        account_id: String(r.account_id),
        carrier: r.carrier ? String(r.carrier) : undefined,
        status: String(r.status || ''),
        booked_at: r.booked_at ? String(r.booked_at) : undefined,
        pickup_window_start: r.pickup_window_start ? String(r.pickup_window_start) : undefined,
        pickup_window_end: r.pickup_window_end ? String(r.pickup_window_end) : undefined,
        pickup_actual_at: r.pickup_actual_at ? String(r.pickup_actual_at) : undefined,
        delivery_window_start: r.delivery_window_start ? String(r.delivery_window_start) : undefined,
        delivery_window_end: r.delivery_window_end ? String(r.delivery_window_end) : undefined,
        actual_delivery: r.actual_delivery ? String(r.actual_delivery) : undefined,
        shipment_fee_inr: r.shipment_fee_inr ? Number(r.shipment_fee_inr) : undefined,
        carrier_fault: Boolean(r.carrier_fault),
        customer_fault: Boolean(r.customer_fault),
        cancellation_requested_at: r.cancellation_requested_at ? String(r.cancellation_requested_at) : undefined,
        cancellation_fee_waived: Boolean(r.cancellation_fee_waived),
        notes: r.notes ? String(r.notes) : undefined,
      }));
    }

    if (wb.Sheets['tickets']) {
      const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['tickets']);
      tickets = rows.map((r) => ({
        ticket_id: String(r.ticket_id),
        account_id: String(r.account_id),
        order_id: r.order_id ? String(r.order_id) : undefined,
        created_at: r.created_at ? String(r.created_at) : undefined,
        status: r.status ? String(r.status) : undefined,
        subject: r.subject ? String(r.subject) : undefined,
        description: r.description ? String(r.description) : undefined,
        channel: r.channel ? String(r.channel) : undefined,
        assigned_to: r.assigned_to ? String(r.assigned_to) : undefined,
        last_customer_message_at: r.last_customer_message_at ? String(r.last_customer_message_at) : undefined,
        resolution: r.resolution ? String(r.resolution) : undefined,
        advisory_only: true,
      }));
    }
  }

  // Pre-configured policy text chunks from candidate data pack
  const chunks: DocChunk[] = [
    // 01 Support Policy v3 (CURRENT)
    {
      id: 'SUPPORT-POL-V3-1',
      doc_id: 'SUPPORT-POL-V3',
      doc_name: 'Support Policy v3 (CURRENT)',
      doc_type: 'policy',
      status: 'CURRENT',
      effective_date: '1 May 2026',
      scope: 'general',
      chunk_index: 1,
      content: `ParcelPilot Support Policy v3 (CURRENT - Effective 1 May 2026, Supersedes v2)
1. Scope & Source Precedence:
This policy defines default support severity, response targets, and general support rules. A signed customer agreement (Enterprise or Growth Agreement) overrides these defaults wherever specified. When sources conflict, use the signed customer agreement over standard general policy.

2. Severity Levels & SLA Targets:
- P1 (Critical / Down): Response within 1 hour. Applies when shipment creation or tracking is completely unavailable across an entire account.
- P2 (High): Response within 4 hours. Applies when major functions (like bulk upload) fail, but workarounds exist.
- P3 (Normal): Response within 24 hours. General inquiry, billing questions, minor issues.
- P4 (Low): Response within 48 hours. Feature requests, general feedback.`,
    },
    {
      id: 'SUPPORT-POL-V3-2',
      doc_id: 'SUPPORT-POL-V3',
      doc_name: 'Support Policy v3 (CURRENT)',
      doc_type: 'policy',
      status: 'CURRENT',
      effective_date: '1 May 2026',
      scope: 'general',
      chunk_index: 2,
      content: `ParcelPilot Support Policy v3 (CURRENT) - Support Hours & Escalations:
Standard Support Hours: Monday to Saturday, 09:00 to 19:00 IST.
Premium Support (for Enterprise accounts or accounts with Premium Support flag): 24/7 support for P1/P2 incidents.

Escalation Protocol:
If SLA response target is breached, or customer requests escalation due to unresolved high-severity issue, support team creates an internal escalation ticket for Operations lead review.`,
    },

    // 02 Support Policy v2 (DEPRECATED)
    {
      id: 'SUPPORT-POL-V2-1',
      doc_id: 'SUPPORT-POL-V2',
      doc_name: 'Support Policy v2 (DEPRECATED)',
      doc_type: 'policy',
      status: 'DEPRECATED',
      effective_date: '1 January 2025',
      scope: 'general',
      chunk_index: 1,
      content: `ParcelPilot Support Policy v2 (DEPRECATED - DO NOT USE FOR CURRENT REQUESTS - Effective 1 Jan 2025, Superseded by v3 on 1 May 2026)
Older response targets:
P1: Response within 2 hours.
P2: Response within 8 hours.
P3: Response within 48 hours.
Note: This document is deprecated and retained for historical reference only. Current policies in v3 supersede all rules herein.`,
    },

    // 03 Cancellation & Service Credit SOP v4
    {
      id: 'CANC-SLA-SOP-V4-1',
      doc_id: 'CANC-SLA-SOP-V4',
      doc_name: 'Cancellation & Service Credit SOP v4',
      doc_type: 'sop',
      status: 'CURRENT',
      effective_date: '15 June 2026',
      scope: 'general',
      chunk_index: 1,
      content: `ParcelPilot Cancellation & Service Credit SOP v4 (CURRENT - Effective 15 June 2026)
1. Order Cancellation Terms:
- DRAFT Status: May be cancelled at any time with NO cancellation fee.
- BOOKED Status (Not yet PICKED_UP):
  * Standard Rule: Cancellations requested within 60 minutes of booking incur NO fee.
  * Cancellations requested after 60 minutes of booking incur a standard cancellation fee of INR 250 (unless overridden by customer enterprise agreement).
- PICKED_UP / IN_TRANSIT Status: Cannot be cancelled via automated self-service or standard flow. Requires human ops intervention and carrier return fee.`,
    },
    {
      id: 'CANC-SLA-SOP-V4-2',
      doc_id: 'CANC-SLA-SOP-V4',
      doc_name: 'Cancellation & Service Credit SOP v4',
      doc_type: 'sop',
      status: 'CURRENT',
      effective_date: '15 June 2026',
      scope: 'general',
      chunk_index: 2,
      content: `ParcelPilot Cancellation & Service Credit SOP v4 - Service Credits for Delays & Carrier Fault:
2. Pickup Delay Service Credit Eligibility:
- Late Pickup due to Carrier Fault:
  * If pickup is delayed by > 2 hours beyond the pickup window end time due to carrier fault, customer is eligible for a 50% service credit on the shipment fee.
  * If pickup is delayed by > 4 hours beyond the pickup window end time due to carrier fault, customer is eligible for a 100% service credit (full refund/credit of shipment fee).
- Delay due to Customer Fault / Incorrect Address: NOT eligible for service credit.
- Standard Agreement vs Customer Override: Customer-specific enterprise agreements may specify custom service credit percentages or zero-fee cancellation windows.`,
    },

    // 04 Product Operations Guide & Known Issues
    {
      id: 'PROD-OPS-GUIDE-1',
      doc_id: 'PROD-OPS-GUIDE',
      doc_name: 'Product Ops Guide & Known Issues',
      doc_type: 'product_ops',
      status: 'CURRENT',
      effective_date: '14 August 2026',
      scope: 'general',
      chunk_index: 1,
      content: `ParcelPilot Product Operations Guide & Known Issues (Updated 14 August 2026)
1. Plan Capabilities:
- Standard Plan: Single shipment booking, standard CSV bulk upload up to 500 rows.
- Growth Plan: Bulk upload up to 2,000 rows, API integration, standard webhook alerts.
- Enterprise Plan: Custom bulk upload up to 10,000 rows, dedicated CSM, 24/7 priority support.

2. Active Known Issues:
- ISSUE-884 (Bulk Upload Failure > 3,000 rows): Bulk upload script currently times out for CSV files exceeding 3,000 rows on Growth tier. Workaround: Split file into 1,500-row chunks.
- ISSUE-912 (HTTP 500 on Shipment Creation for specific accounts): Known issue when account API key permission cache becomes stale. Support team can issue cache reset command.`,
    },

    // 05 Northstar Logistics Enterprise Agreement (ACCT-001)
    {
      id: 'NORTHSTAR-AGREEMENT-1',
      doc_id: 'NORTHSTAR-AGREEMENT',
      doc_name: 'Northstar Logistics Enterprise Agreement',
      doc_type: 'agreement',
      status: 'CURRENT',
      effective_date: '1 January 2026',
      scope: 'account-specific',
      account_id: 'ACCT-001',
      chunk_index: 1,
      content: `ParcelPilot - Northstar Logistics Enterprise Agreement (Account: ACCT-001)
Term: 1 January 2026 to 31 December 2026. Status: ACTIVE. Plan: Enterprise.

Custom Terms & Account Overrides:
1. Cancellation Terms:
- Northstar Logistics may cancel any BOOKED shipment prior to physical pickup (PICKED_UP status) with ZERO cancellation fee, regardless of time elapsed since booking. This explicitly overrides standard SOP cancellation fees.
2. Custom SLA & Response Times:
- P1 Critical Issues: 30 minutes response target (24/7).
- P2 High Issues: 2 hours response target.
3. Service Credit Terms:
- Any pickup delayed > 1 hour due to carrier fault qualifies for a 100% service credit refund.`,
    },

    // 06 LumenWorks Service Agreement (ACCT-002)
    {
      id: 'LUMENWORKS-AGREEMENT-1',
      doc_id: 'LUMENWORKS-AGREEMENT',
      doc_name: 'LumenWorks Service Agreement',
      doc_type: 'agreement',
      status: 'CURRENT',
      effective_date: '1 March 2026',
      scope: 'account-specific',
      account_id: 'ACCT-002',
      chunk_index: 1,
      content: `ParcelPilot - LumenWorks Service Agreement (Account: ACCT-002)
Term: 1 March 2026 to 28 February 2027. Status: ACTIVE. Plan: Growth.

Custom Terms & Account Overrides:
1. Cancellation Terms:
- Standard SOP cancellation rules apply (cancellation within 60 minutes free; after 60 minutes incurs INR 250 fee for BOOKED shipments).
2. Service Credit Terms:
- Pickup delayed > 2 hours due to carrier fault qualifies for 100% service credit refund (overriding standard SOP 50% tier).`,
    },
  ];

  cachedDataset = { snapshotTime, accounts, orders, tickets, chunks };
  return cachedDataset;
}
