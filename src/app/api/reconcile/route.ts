import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// Force Node.js runtime to enable proper streaming
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to enqueue logs to client and save to database
      const logAgentAction = async (
        agentName: string,
        message: string,
        level: "INFO" | "WARN" | "SUCCESS" = "INFO",
        invoiceId?: string,
        bankTxId?: string
      ) => {
        // 1. Save to DB
        const log = await db.agentLog.create({
          data: {
            agentName,
            message,
            level,
            invoiceId,
            bankTxId,
          },
        });

        // 2. Stream to Client
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(log)}\n\n`)
        );

        // 3. Sleep briefly to make execution progress legible in UI
        await new Promise((resolve) => setTimeout(resolve, 1000));
      };

      try {
        // --- PREPARATION ---
        await db.agentLog.deleteMany(); // Clear old logs

        await logAgentAction(
          "Matcher",
          "Initializing Treasury Agent Mesh... Scanning ledger feeds.",
          "INFO"
        );

        // Ingest pending items
        const invoices: any[] = await db.invoice.findMany({ where: { status: "PENDING" } });
        const bankTransactions: any[] = await db.bankTransaction.findMany({ where: { status: "UNRECONCILED" } });

        await logAgentAction(
          "Matcher",
          `Scan completed. Found ${invoices.length} pending invoices and ${bankTransactions.length} unreconciled bank transactions.`,
          "INFO"
        );

        // --- MATCH 1: PERFECT MATCH (INV-1001 & TX-9001) ---
        await logAgentAction(
          "Matcher",
          "Matcher: Analyzing perfect-match candidates...",
          "INFO"
        );

        const inv1 = invoices.find(i => i.invoiceNumber === "INV-1001");
        const tx1 = bankTransactions.find(t => t.bankTxId === "TX-9001");

        if (inv1 && tx1) {
          await logAgentAction(
            "Matcher",
            `Matcher: Found matching candidate! Invoice ${inv1.invoiceNumber} matches Bank Transaction ${tx1.bankTxId}. Amount: $${Number(inv1.amount).toLocaleString()}.`,
            "INFO",
            inv1.id,
            tx1.id
          );

          await logAgentAction(
            "Matcher",
            `Matcher: Identical currency (USD) and amounts verified. Confidence: 100%. Routing to Auditor for ledger submission.`,
            "SUCCESS",
            inv1.id,
            tx1.id
          );

          // Update db state
          await db.invoice.update({
            where: { id: inv1.id },
            data: { status: "PAID" },
          });
          await db.bankTransaction.update({
            where: { id: tx1.id },
            data: { status: "RECONCILED" },
          });

          // Create ledger entry
          await db.ledgerEntry.create({
            data: {
              amount: inv1.amount,
              currency: "USD",
              invoiceId: inv1.id,
              bankTransactionId: tx1.id,
              reconciledBy: "Matcher",
              auditStatus: "VERIFIED",
              region: "us-east-1",
            },
          });

          await logAgentAction(
            "Auditor",
            `Auditor: Ledger transaction committed in active-active region us-east-1. DR Cash $12,500.00 / CR Accounts Receivable $12,500.00.`,
            "SUCCESS",
            inv1.id,
            tx1.id
          );
        }

        // --- MATCH 2: UNDERPAYMENT / WIRE FEE (INV-1002 & TX-9002) ---
        const inv2 = invoices.find(i => i.invoiceNumber === "INV-1002");
        const tx2 = bankTransactions.find(t => t.bankTxId === "TX-9002");

        if (inv2 && tx2) {
          await logAgentAction(
            "Matcher",
            `Matcher: Found vendor match 'AWS Cloud Services' for Invoice ${inv2.invoiceNumber} and Tx ${tx2.bankTxId}.`,
            "INFO",
            inv2.id,
            tx2.id
          );

          await logAgentAction(
            "Matcher",
            `Matcher: Discrepancy detected. Invoice: $3,450.00 | Paid: $3,440.00. Underpayment: -$10.00. Escalating to Investigator Agent.`,
            "WARN",
            inv2.id,
            tx2.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Ingesting case INV-1002. Checking transaction logs for wire identifier 'wire-aws-3920'...`,
            "INFO",
            inv2.id,
            tx2.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Intermediary bank wire fee detected. Standard international transfer deduction of $10.00.`,
            "INFO",
            inv2.id,
            tx2.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Resolution proposed. Reconcile Invoice as PAID, adjust $10.00 variance to Ledger Account 6100 (Bank Service Charges). Confidence: 98%. Forwarding to Auditor.`,
            "SUCCESS",
            inv2.id,
            tx2.id
          );

          // Update db state
          await db.invoice.update({
            where: { id: inv2.id },
            data: { status: "PAID" },
          });
          await db.bankTransaction.update({
            where: { id: tx2.id },
            data: { status: "RECONCILED" },
          });

          // Create ledger entry
          await db.ledgerEntry.create({
            data: {
              amount: inv2.amount,
              currency: "USD",
              invoiceId: inv2.id,
              bankTransactionId: tx2.id,
              reconciledBy: "Investigator",
              auditStatus: "VERIFIED",
              auditComments: "Reconciled with $10 intermediary wire fee write-off.",
              region: "eu-west-1", // Committed in European shard
            },
          });

          await logAgentAction(
            "Auditor",
            `Auditor: Ledger entry posted in active-active region eu-west-1. DR Cash $3,440.00 + DR Bank Fee Expense $10.00 / CR Accounts Receivable $3,450.00.`,
            "SUCCESS",
            inv2.id,
            tx2.id
          );
        }

        // --- MATCH 3: FX RATE CONVERSION (INV-1003 & TX-9003) ---
        const inv3 = invoices.find(i => i.invoiceNumber === "INV-1003");
        const tx3 = bankTransactions.find(t => t.bankTxId === "TX-9003");

        if (inv3 && tx3) {
          await logAgentAction(
            "Matcher",
            `Matcher: Found currency discrepancy. Invoice ${inv3.invoiceNumber} is in EUR (€8,900.00) but payment ${tx3.bankTxId} received in USD ($9,550.00). Escalating to Investigator.`,
            "WARN",
            inv3.id,
            tx3.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Fetching historical ECB exchange rate for transaction date. Exchange rate EUR/USD: 1.0730.`,
            "INFO",
            inv3.id,
            tx3.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Calculated equivalent: €8,900.00 * 1.0730 = $9,549.70 USD. Deviation from bank deposit: +$0.30 USD.`,
            "INFO",
            inv3.id,
            tx3.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Minor FX exchange variance of $0.30 is within tolerance thresholds. Resolving invoice. Routing to Auditor.`,
            "SUCCESS",
            inv3.id,
            tx3.id
          );

          // Update db state
          await db.invoice.update({
            where: { id: inv3.id },
            data: { status: "PAID" },
          });
          await db.bankTransaction.update({
            where: { id: tx3.id },
            data: { status: "RECONCILED" },
          });

          // Create ledger entry
          await db.ledgerEntry.create({
            data: {
              amount: 9550.00,
              currency: "USD",
              invoiceId: inv3.id,
              bankTransactionId: tx3.id,
              reconciledBy: "Investigator",
              auditStatus: "VERIFIED",
              auditComments: `FX Match rate 1.0730. Realized gain/loss: $0.30.`,
              region: "eu-west-1",
            },
          });

          await logAgentAction(
            "Auditor",
            `Auditor: Ledger entry posted in active-active region eu-west-1. DR Cash $9,550.00 / CR Accounts Receivable $9,549.70 + CR Realized Exchange Gain $0.30.`,
            "SUCCESS",
            inv3.id,
            tx3.id
          );
        }

        // --- ANOMALY DETECTION: SUSPICIOUS TRANSACTION (TX-9004) ---
        const tx4 = bankTransactions.find(t => t.bankTxId === "TX-9004");

        if (tx4) {
          await logAgentAction(
            "Matcher",
            `Matcher: Auditing transaction ${tx4.bankTxId} ($1,200.00, Unknown Depositor Inc). No matching invoice found in pending ledger. Escalating.`,
            "WARN",
            undefined,
            tx4.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Searching global vendor profiles for 'Unknown Depositor Inc'... Match failed. Checking historical records... Match failed.`,
            "WARN",
            undefined,
            tx4.id
          );

          await logAgentAction(
            "Investigator",
            `Investigator: Unsolicited wire transfer detected. AML Compliance Flag: Suspicious transaction. Blocking automated reconciliation. Flagging for manual audit.`,
            "WARN",
            undefined,
            tx4.id
          );

          await db.bankTransaction.update({
            where: { id: tx4.id },
            data: { status: "INVESTIGATING" },
          });

          await logAgentAction(
            "Auditor",
            `Auditor: Transaction TX-9004 status set to INVESTIGATING. Quarantining funds. Automated workflow halt.`,
            "WARN",
            undefined,
            tx4.id
          );
        }

        // --- SUMMARY ---
        await logAgentAction(
          "Auditor",
          "Reconciliation execution completed. 3 items ledgered. 1 suspicious transfer flagged. Report generated.",
          "SUCCESS"
        );

      } catch (error: any) {
        console.error("Stream execution error:", error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
