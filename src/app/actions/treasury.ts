"use server";

import { db } from "@/lib/db";

// Fetch all invoices
export async function getInvoices() {
  try {
    let invoices = await db.invoice.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (invoices.length === 0) {
      console.log("No invoices found in database. Auto-seeding initial demo data...");
      await resetDemo();
      invoices = await db.invoice.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    return invoices;
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
}

// Fetch all bank transactions
export async function getBankTransactions() {
  try {
    let transactions = await db.bankTransaction.findMany({
      orderBy: { transactionDate: "desc" },
    });

    if (transactions.length === 0) {
      console.log("No bank transactions found in database. Auto-seeding initial demo data...");
      await resetDemo();
      transactions = await db.bankTransaction.findMany({
        orderBy: { transactionDate: "desc" },
      });
    }

    return transactions;
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

// Fetch connection status of the database
export async function getDbStatus() {
  try {
    return {
      isMock: (db as any).isMock ?? false,
      hasUrl: !!process.env.DATABASE_URL,
      urlValue: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : null,
    };
  } catch (error) {
    return { isMock: true, hasUrl: false, urlValue: null };
  }
}

