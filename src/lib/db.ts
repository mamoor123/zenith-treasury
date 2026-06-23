import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

// Define mock data store interfaces
interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  vendor: string;
  description: string | null;
  issueDate: Date;
  dueDate: Date;
  status: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BankTransaction {
  id: string;
  bankTxId: string;
  amount: number;
  currency: string;
  senderName: string;
  description: string | null;
  transactionDate: Date;
  status: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LedgerEntry {
  id: string;
  entryDate: Date;
  amount: number;
  currency: string;
  invoiceId: string | null;
  bankTransactionId: string | null;
  reconciledBy: string;
  auditStatus: string;
  auditComments: string | null;
  region: string;
  createdAt: Date;
}

interface AgentLog {
  id: string;
  agentName: string;
  message: string;
  timestamp: Date;
  level: string;
  invoiceId: string | null;
  bankTxId: string | null;
}

// In-memory data store with seeded mock data for demo mode
let mockInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-1001",
    amount: 12500.00,
    currency: "USD",
    vendor: "Vercel Hosting Inc",
    description: "Enterprise Frontend Platform Subscription",
    issueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    region: "us-east-1",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-1002",
    amount: 3450.00,
    currency: "USD",
    vendor: "AWS Cloud Services",
    description: "AWS Cloud Infrastructure Billing - May 2026",
    issueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    region: "eu-west-1",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-1003",
    amount: 8900.00,
    currency: "EUR",
    vendor: "Acme Corp Europe",
    description: "Consulting fees & regional support contract",
    issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    region: "eu-west-1",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "inv-4",
    invoiceNumber: "INV-1004",
    amount: 150.00,
    currency: "USD",
    vendor: "GitHub Enterprise",
    description: "Developer seats license",
    issueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
    status: "PENDING",
    region: "us-east-1",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  }
];

let mockBankTransactions: BankTransaction[] = [
  {
    id: "tx-1",
    bankTxId: "TX-9001",
    amount: 12500.00,
    currency: "USD",
    senderName: "Vercel Hosting Inc",
    description: "ACH Transfer ACH-VERCEL-1001",
    transactionDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
    status: "UNRECONCILED",
    region: "us-east-1",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: "tx-2",
    bankTxId: "TX-9002",
    amount: 3440.00,
    currency: "USD",
    senderName: "AWS Cloud Services LLC",
    description: "Wire transfer wire-aws-3920",
    transactionDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: "UNRECONCILED",
    region: "eu-west-1",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: "tx-3",
    bankTxId: "TX-9003",
    amount: 9550.00,
    currency: "USD",
    senderName: "Acme Europe SA",
    description: "International transfer FX-ACME-EURUSD",
    transactionDate: new Date(Date.now() - 18 * 60 * 60 * 1000),
    status: "UNRECONCILED",
    region: "eu-west-1",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
  },
  {
    id: "tx-4",
    bankTxId: "TX-9004",
    amount: 1200.00,
    currency: "USD",
    senderName: "Unknown Depositor Inc",
    description: "Cash deposit branch 49",
    transactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "UNRECONCILED",
    region: "us-east-1",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  }
];

let mockLedgerEntries: LedgerEntry[] = [];
let mockAgentLogs: AgentLog[] = [];

// Helper to generate UUIDs locally in mock mode
const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Check if we should use real database or mock fallback
const hasDbUrl = typeof process !== 'undefined' && process.env.DATABASE_URL;

let prismaInstance: any = null;

if (hasDbUrl) {
  try {
    const dbUrl = process.env.DATABASE_URL!;
    const hostMatch = dbUrl.match(/@([^/:]+)/);
    const hostname = hostMatch ? hostMatch[1] : null;

    if (hostname && hostname.includes("dsql")) {
      const signer = new DsqlSigner({
        region: "us-east-1",
        hostname: hostname,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      });

      const pool = new Pool({
        host: hostname,
        port: 5432,
        database: "postgres",
        user: "admin",
        password: async () => {
          try {
            return await signer.getDbConnectAdminAuthToken();
          } catch (e) {
            console.error("Failed to generate DSQL DB connection token:", e);
            throw e;
          }
        },
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000,
      });

      const adapter = new PrismaPg(pool);
      prismaInstance = new PrismaClient({ adapter });
    } else {
      const pool = new Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 5000,
      });
      const adapter = new PrismaPg(pool);
      prismaInstance = new PrismaClient({ adapter });
    }
  } catch (error) {
    console.warn("Failed to initialize Prisma with DATABASE_URL, falling back to mock mode:", error);
  }
}

// Mock Database API wrapper
const mockDb = {
  isMock: true,
  invoice: {
    findMany: async (args?: any) => {
      let result = [...mockInvoices];
      if (args?.where?.status) {
        result = result.filter(i => i.status === args.where.status);
      }
      if (args?.orderBy?.createdAt) {
        result.sort((a, b) => 
          args.orderBy.createdAt === 'desc' 
            ? b.createdAt.getTime() - a.createdAt.getTime() 
            : a.createdAt.getTime() - b.createdAt.getTime()
        );
      }
      return result;
    },
    findUnique: async (args: { where: { id?: string; invoiceNumber?: string } }) => {
      return mockInvoices.find(i => 
        (args.where.id && i.id === args.where.id) || 
        (args.where.invoiceNumber && i.invoiceNumber === args.where.invoiceNumber)
      ) || null;
    },
    create: async (args: { data: any }) => {
      const newInvoice: Invoice = {
        id: uuid(),
        invoiceNumber: args.data.invoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: Number(args.data.amount),
        currency: args.data.currency || "USD",
        vendor: args.data.vendor,
        description: args.data.description || null,
        issueDate: args.data.issueDate ? new Date(args.data.issueDate) : new Date(),
        dueDate: args.data.dueDate ? new Date(args.data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: args.data.status || "PENDING",
        region: args.data.region || "us-east-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInvoices.push(newInvoice);
      return newInvoice;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = mockInvoices.findIndex(i => i.id === args.where.id);
      if (idx === -1) throw new Error("Invoice not found");
      const updated = {
        ...mockInvoices[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      mockInvoices[idx] = updated;
      return updated;
    },
  },
  bankTransaction: {
    findMany: async (args?: any) => {
      let result = [...mockBankTransactions];
      if (args?.where?.status) {
        result = result.filter(t => t.status === args.where.status);
      }
      if (args?.orderBy?.transactionDate) {
        result.sort((a, b) => 
          args.orderBy.transactionDate === 'desc' 
            ? b.transactionDate.getTime() - a.transactionDate.getTime() 
            : a.transactionDate.getTime() - b.transactionDate.getTime()
        );
      }
      return result;
    },
    create: async (args: { data: any }) => {
      const newTx: BankTransaction = {
        id: uuid(),
        bankTxId: args.data.bankTxId || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: Number(args.data.amount),
        currency: args.data.currency || "USD",
        senderName: args.data.senderName,
        description: args.data.description || null,
        transactionDate: args.data.transactionDate ? new Date(args.data.transactionDate) : new Date(),
        status: args.data.status || "UNRECONCILED",
        region: args.data.region || "us-east-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockBankTransactions.push(newTx);
      return newTx;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = mockBankTransactions.findIndex(t => t.id === args.where.id);
      if (idx === -1) throw new Error("BankTransaction not found");
      const updated = {
        ...mockBankTransactions[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      mockBankTransactions[idx] = updated;
      return updated;
    },
  },
  ledgerEntry: {
    findMany: async (args?: any) => {
      let result = [...mockLedgerEntries];
      // Include mock relations if queried
      return result.map(entry => {
        const invoice = mockInvoices.find(i => i.id === entry.invoiceId) || null;
        const bankTransaction = mockBankTransactions.find(t => t.id === entry.bankTransactionId) || null;
        return {
          ...entry,
          invoice,
          bankTransaction
        };
      });
    },
    create: async (args: { data: any }) => {
      const newEntry: LedgerEntry = {
        id: uuid(),
        entryDate: new Date(),
        amount: Number(args.data.amount),
        currency: args.data.currency,
        invoiceId: args.data.invoiceId || null,
        bankTransactionId: args.data.bankTransactionId || null,
        reconciledBy: args.data.reconciledBy || "AI_SYSTEM",
        auditStatus: args.data.auditStatus || "VERIFIED",
        auditComments: args.data.auditComments || null,
        region: args.data.region || "us-east-1",
        createdAt: new Date(),
      };
      mockLedgerEntries.push(newEntry);
      return newEntry;
    },
  },
  agentLog: {
    findMany: async (args?: any) => {
      let result = [...mockAgentLogs];
      if (args?.orderBy?.timestamp) {
        result.sort((a, b) => 
          args.orderBy.timestamp === 'desc' 
            ? b.timestamp.getTime() - a.timestamp.getTime() 
            : a.timestamp.getTime() - b.timestamp.getTime()
        );
      }
      return result;
    },
    create: async (args: { data: any }) => {
      const newLog: AgentLog = {
        id: uuid(),
        agentName: args.data.agentName,
        message: args.data.message,
        timestamp: new Date(),
        level: args.data.level || "INFO",
        invoiceId: args.data.invoiceId || null,
        bankTxId: args.data.bankTxId || null,
      };
      mockAgentLogs.push(newLog);
      return newLog;
    },
    deleteMany: async () => {
      mockAgentLogs = [];
      return { count: mockAgentLogs.length };
    },
  },
  reset: async () => {
    mockInvoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-1001",
        amount: 12500.00,
        currency: "USD",
        vendor: "Vercel Hosting Inc",
        description: "Enterprise Frontend Platform Subscription",
        issueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        region: "us-east-1",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-1002",
        amount: 3450.00,
        currency: "USD",
        vendor: "AWS Cloud Services",
        description: "AWS Cloud Infrastructure Billing - May 2026",
        issueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        region: "eu-west-1",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: "inv-3",
        invoiceNumber: "INV-1003",
        amount: 8900.00,
        currency: "EUR",
        vendor: "Acme Corp Europe",
        description: "Consulting fees & regional support contract",
        issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        region: "eu-west-1",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: "inv-4",
        invoiceNumber: "INV-1004",
        amount: 150.00,
        currency: "USD",
        vendor: "GitHub Enterprise",
        description: "Developer seats license",
        issueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        region: "us-east-1",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }
    ];

    mockBankTransactions = [
      {
        id: "tx-1",
        bankTxId: "TX-9001",
        amount: 12500.00,
        currency: "USD",
        senderName: "Vercel Hosting Inc",
        description: "ACH Transfer ACH-VERCEL-1001",
        transactionDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: "UNRECONCILED",
        region: "us-east-1",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        id: "tx-2",
        bankTxId: "TX-9002",
        amount: 3440.00,
        currency: "USD",
        senderName: "AWS Cloud Services LLC",
        description: "Wire transfer wire-aws-3920",
        transactionDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
        status: "UNRECONCILED",
        region: "eu-west-1",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        id: "tx-3",
        bankTxId: "TX-9003",
        amount: 9550.00,
        currency: "USD",
        senderName: "Acme Europe SA",
        description: "International transfer FX-ACME-EURUSD",
        transactionDate: new Date(Date.now() - 18 * 60 * 60 * 1000),
        status: "UNRECONCILED",
        region: "eu-west-1",
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      },
      {
        id: "tx-4",
        bankTxId: "TX-9004",
        amount: 1200.00,
        currency: "USD",
        senderName: "Unknown Depositor Inc",
        description: "Cash deposit branch 49",
        transactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: "UNRECONCILED",
        region: "us-east-1",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      }
    ];

    mockLedgerEntries = [];
    mockAgentLogs = [];
    return { success: true };
  }
};

// Internal state to track if we dynamically fell back to mock data
let isMockFallbackState = false;

// Export active db interface (real or mock) with automatic fallback Proxy
const baseDb = prismaInstance ? { 
  ...prismaInstance, 
  isMock: false,
  reset: async () => {
    try {
      await prismaInstance.ledgerEntry.deleteMany();
      await prismaInstance.agentLog.deleteMany();
      await prismaInstance.invoice.updateMany({ data: { status: "PENDING" } });
      await prismaInstance.bankTransaction.updateMany({ data: { status: "UNRECONCILED" } });
      return { success: true };
    } catch (e) {
      console.warn("Real database reset failed, resetting mock instead:", e);
      return await mockDb.reset();
    }
  }
} : mockDb;

export const db = new Proxy(baseDb, {
  get(target, prop) {
    // If it's a metadata property, return dynamic state
    if (prop === 'isMock') {
      return prismaInstance ? isMockFallbackState : true;
    }
    if (prop === 'isMockFallback') {
      return isMockFallbackState;
    }
    if (prop === 'reset') {
      return target.reset;
    }

    // Intercept model properties (invoice, bankTransaction, ledgerEntry, agentLog)
    const model = (target as any)[prop];
    if (model && typeof model === 'object' && prop !== 'reset') {
      return new Proxy(model, {
        get(modelTarget, method) {
          const originalMethod = modelTarget[method];
          if (typeof originalMethod === 'function') {
            return async function (...args: any[]) {
              try {
                // Try executing the real database query
                return await originalMethod.apply(modelTarget, args);
              } catch (error) {
                // If it fails (e.g. table not found or connection error), log and fallback to mock!
                console.warn(`Prisma query "${String(prop)}.${String(method)}" failed. Falling back to Mock Data. Error:`, error);
                isMockFallbackState = true;
                
                // Get corresponding mock model
                const mockModel = (mockDb as any)[prop];
                if (mockModel && mockModel[method]) {
                  return await mockModel[method].apply(mockModel, args);
                }
                throw error;
              }
            };
          }
          return originalMethod;
        }
      });
    }
    return target[prop as keyof typeof target];
  }
}) as any;
