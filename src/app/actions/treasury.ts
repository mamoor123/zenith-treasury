"use server";

import { db } from "@/lib/db";

// Fetch all invoices
export async function getInvoices() {
  try {
    return await db.invoice.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
}

// Fetch all bank transactions
export async function getBankTransactions() {
  try {
    return await db.bankTransaction.findMany({
      orderBy: { transactionDate: "desc" },
    });
  } catch (error) {
    console.error("Error fetching bank transactions:", error);
    return [];
  }
}

// Fetch reconciled ledger entries
export async function getLedgerEntries() {
  try {
    return await db.ledgerEntry.findMany({
      orderBy: { entryDate: "desc" },
    });
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    return [];
  }
}

// Fetch agent execution logs
export async function getAgentLogs() {
  try {
    return await db.agentLog.findMany({
      orderBy: { timestamp: "asc" },
    });
  } catch (error) {
    console.error("Error fetching agent logs:", error);
    return [];
  }
}

// Clear all agent logs
export async function clearAgentLogs() {
  try {
    await db.agentLog.deleteMany();
    return { success: true };
  } catch (error) {
    console.error("Error clearing agent logs:", error);
    return { success: false };
  }
}

// Reset the entire demo database (mock or real)
export async function resetDemo() {
  try {
    return await (db as any).reset();
  } catch (error) {
    console.error("Error resetting demo:", error);
    return { success: false };
  }
}
