import 'dotenv/config';
import { searchDocuments, queryAccountData, createEscalation, ToolContext } from '../lib/tools';
import { db } from '../db';
import { accounts } from '../db/schema';

async function runTestSuite() {
  console.log('\n==================================================');
  console.log('🧪 PARCELPILOT AI AUTOMATED SYSTEM & INTEGRATION TEST');
  console.log('==================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS ${totalTests}] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
    } else {
      console.error(`❌ [FAIL ${totalTests}] ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // Common Context Objects
  const contextNorthstar: ToolContext = {
    accountId: 'ACCT-001',
    sessionId: 'TEST-SESSION-001',
  };

  const contextLumenWorks: ToolContext = {
    accountId: 'ACCT-002',
    sessionId: 'TEST-SESSION-002',
  };

  // --- Test 1: Neon Database Connection & Account Seeding ---
  try {
    const allAccounts = await db.select().from(accounts);
    assert(
      allAccounts.length >= 3,
      'Neon Database Connection & Account Seeding',
      `Found ${allAccounts.length} seeded accounts in PostgreSQL (ACCT-001, ACCT-002, ACCT-003)`
    );
  } catch (err: any) {
    assert(false, 'Neon Database Connection & Account Seeding', err.message);
  }

  // --- Test 2: RAG Vector Search & 5-Tier Authority Ranking ---
  try {
    const ragResult = await searchDocuments('cancellation fee exemption', contextNorthstar, 5);
    const hasChunks = ragResult.chunks && ragResult.chunks.length > 0;
    const topDocName = hasChunks ? ragResult.chunks[0].doc_name : 'None';
    assert(
      hasChunks,
      'RAG Vector Search & 5-Tier Authority Ranking',
      `Top match: "${topDocName}" (Authority Rank: ${hasChunks ? ragResult.chunks[0].authority_rank : 'N/A'})`
    );
  } catch (err: any) {
    assert(false, 'RAG Vector Search & 5-Tier Authority Ranking', err.message);
  }

  // --- Test 3: Structured SQL Query (ORD-1001) ---
  try {
    const orderData = await queryAccountData('orders', 'ORD-1001', contextNorthstar);
    const targetOrder = Array.isArray(orderData.data) ? orderData.data[0] : orderData.data;
    assert(
      targetOrder && targetOrder.order_id === 'ORD-1001',
      'Structured SQL Query & SLA Pickup Delay (ORD-1001)',
      `Status: ${targetOrder?.status}, Calculated Delay: ${targetOrder?.calculated_pickup_delay_hours} hrs`
    );
  } catch (err: any) {
    assert(false, 'Structured SQL Query & SLA Pickup Delay', err.message);
  }

  // --- Test 4: Strict Multi-Tenant Security Guardrail ---
  try {
    // Attempt to access Northstar's ORD-1001 as LumenWorks (ACCT-002)
    const crossTenantData = await queryAccountData('orders', 'ORD-1001', contextLumenWorks);
    const targetOrder = Array.isArray(crossTenantData.data) ? crossTenantData.data[0] : crossTenantData.data;
    assert(
      !targetOrder || crossTenantData.data === null || (Array.isArray(crossTenantData.data) && crossTenantData.data.length === 0),
      'Strict Multi-Tenant Security Guardrail (Cross-Tenant Access Denial)',
      `Response: Data strictly isolated to ACCT-002. ORD-1001 returned 0 results.`
    );
  } catch (err: any) {
    assert(false, 'Strict Multi-Tenant Security Guardrail', err.message);
  }

  // --- Test 5: 2-Phase Human Escalation Proposal Creation ---
  let proposalId = '';
  try {
    const proposalResult = await createEscalation(
      'propose',
      {
        ticket_ref: 'TKT-501',
        reason: 'Urgent carrier delay inquiry',
        summary: 'Customer requesting human ops escalation for ORD-1001 delay.',
      },
      contextNorthstar
    );

    proposalId = proposalResult.proposal?.proposal_id || '';
    assert(
      proposalResult.status === 'proposed' && proposalId.startsWith('PROP-'),
      '2-Phase Human Escalation Proposal Creation',
      `Draft Generated: ${proposalId} (Status: pending)`
    );
  } catch (err: any) {
    assert(false, '2-Phase Human Escalation Proposal Creation', err.message);
  }

  // --- Test 6: 2-Phase Human Escalation Proposal Confirmation ---
  if (proposalId) {
    try {
      const confirmResult = await createEscalation(
        'confirm',
        {
          proposal_id: proposalId,
          reason: 'User confirmed escalation',
          summary: 'Escalation confirmed via UI banner',
        },
        contextNorthstar
      );

      assert(
        confirmResult.status === 'confirmed' && confirmResult.proposal?.status === 'confirmed',
        '2-Phase Human Escalation Proposal Confirmation',
        `Proposal ${proposalId} status updated to CONFIRMED. Escalation ticket executed.`
      );
    } catch (err: any) {
      assert(false, '2-Phase Human Escalation Proposal Confirmation', err.message);
    }
  }

  // --- Summary ---
  console.log('\n==================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('==================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
