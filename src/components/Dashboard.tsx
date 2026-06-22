"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCcw,
  FileText,
  DollarSign,
  Activity,
  ShieldAlert,
  Globe,
  Terminal,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  getInvoices,
  getBankTransactions,
  getLedgerEntries,
  getAgentLogs,
  resetDemo,
} from "@/app/actions/treasury";

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
  invoice?: Invoice | null;
  bankTransaction?: BankTransaction | null;
}

interface AgentLog {
  id: string;
  agentName: string;
  message: string;
  timestamp: Date;
  level: string;
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load initial data
  const loadData = async () => {
    const [invs, txs, ledger, logs] = await Promise.all([
      getInvoices(),
      getBankTransactions(),
      getLedgerEntries(),
      getAgentLogs(),
    ]);
    
    // Cast and set
    setInvoices(invs as any);
    setTransactions(txs as any);
    setLedgerEntries(ledger as any);
    setAgentLogs(logs as any);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to bottom of terminal when logs update
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [agentLogs]);

  // Handle Demo Reset
  const handleReset = async () => {
    setIsResetting(true);
    setActiveAgent(null);
    setIsRunning(false);
    await resetDemo();
    await loadData();
    // Clear logs explicitly in state
    setAgentLogs([]);
    setTimeout(() => setIsResetting(false), 500);
  };

  // Handle Reconciliation Trigger (Streaming API Call)
  const handleReconcile = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setAgentLogs([]); // Clear logs in UI for new run

    try {
      const response = await fetch("/api/reconcile", { method: "POST" });
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // SSE formatting parser
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const logData = JSON.parse(line.trim().slice(6)) as AgentLog;
              // Format timestamps
              logData.timestamp = new Date(logData.timestamp);
              setAgentLogs((prev) => [...prev, logData]);
              setActiveAgent(logData.agentName);
              
              // Refresh table data concurrently to show state updates
              await loadData();
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Reconciliation error:", error);
    } finally {
      setIsRunning(false);
      setActiveAgent(null);
      await loadData();
    }
  };

  // Helper stats
  const pendingInvoicesCount = invoices.filter(i => i.status === "PENDING").length;
  const unreconciledTxCount = transactions.filter(t => t.status === "UNRECONCILED").length;
  const anomaliesCount = transactions.filter(t => t.status === "INVESTIGATING").length;
  const totalReconciled = ledgerEntries.length;

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#06060c] text-gray-100">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-indigo-500 animate-pulse" />
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-indigo-500 bg-clip-text text-transparent">
              Zenith Treasury
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              DSQL Active-Active Mesh
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            B2B Multi-Agent Treasury & Cross-Border Ledger Orchestration
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleReset}
            disabled={isResetting || isRunning}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900/50 hover:bg-gray-800 text-gray-300 transition-all font-medium text-sm disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting && "animate-spin"}`} />
            Reset Demo
          </button>
          <button
            onClick={handleReconcile}
            disabled={isRunning || pendingInvoicesCount === 0}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            <Play className={`w-4 h-4 ${isRunning && "animate-ping"}`} />
            {isRunning ? "Running Agent Mesh..." : "Trigger AI Reconciliation"}
          </button>
        </div>
      </header>

      {/* METRICS ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Treasury Cash Assets</span>
            <h3 className="text-2xl font-bold mt-1 text-emerald-400">$2,415,800.00</h3>
            <span className="text-xs text-gray-400 mt-1 block">Across Dublin & Virginia shards</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Pending Invoices</span>
            <h3 className="text-2xl font-bold mt-1 text-yellow-500">{pendingInvoicesCount}</h3>
            <span className="text-xs text-gray-400 mt-1 block">Awaiting payment matching</span>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Reconciled Ledger</span>
            <h3 className="text-2xl font-bold mt-1 text-indigo-400">{totalReconciled}</h3>
            <span className="text-xs text-gray-400 mt-1 block">Committed to Aurora DSQL</span>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Suspicious Flagged</span>
            <h3 className={`text-2xl font-bold mt-1 ${anomaliesCount > 0 ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
              {anomaliesCount}
            </h3>
            <span className="text-xs text-gray-400 mt-1 block">Failed AML verification</span>
          </div>
          <div className={`p-3 rounded-lg ${anomaliesCount > 0 ? "bg-red-500/10 text-red-500" : "bg-gray-800 text-gray-500"}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* INTERACTIVE AGENT GRAPH VISUALIZATION */}
      <section className="glass-panel p-6 rounded-xl mb-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Autonomous Agent Execution Mesh
        </h2>
        <div className="flex flex-col lg:flex-row justify-around items-center gap-6 py-4 relative">
          
          {/* Agent 1: Matcher */}
          <div className={`glass-card p-5 rounded-xl w-64 border transition-all ${
            activeAgent === "Matcher" 
              ? "glow-active-matcher scale-105 border-emerald-500/80 bg-emerald-950/10" 
              : "border-gray-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeAgent === "Matcher" ? "bg-emerald-500/20 text-emerald-400 animate-pulse" : "bg-gray-800 text-gray-400"}`}>
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Matcher Agent</h4>
                <span className="text-xs text-emerald-400">Scanning & Fuzzy Matching</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 line-clamp-2">
              Matches invoices and bank inputs. Escals rate discrepancies or missing files.
            </p>
            <div className="mt-3 flex justify-between items-center text-[10px]">
              <span className="text-gray-500 uppercase font-mono">Status</span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                activeAgent === "Matcher" 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-gray-800 text-gray-500"
              }`}>{activeAgent === "Matcher" ? "ANALYZING" : "STANDBY"}</span>
            </div>
          </div>

          <ArrowRight className="hidden lg:block w-6 h-6 text-gray-700" />

          {/* Agent 2: Investigator */}
          <div className={`glass-card p-5 rounded-xl w-64 border transition-all ${
            activeAgent === "Investigator" 
              ? "glow-active-investigator scale-105 border-yellow-500/80 bg-yellow-950/10" 
              : "border-gray-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeAgent === "Investigator" ? "bg-yellow-500/20 text-yellow-400 animate-pulse" : "bg-gray-800 text-gray-400"}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Investigator Agent</h4>
                <span className="text-xs text-yellow-400">Anomaly & FX Resolver</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 line-clamp-2">
              Performs currency conversions, cross-references transaction codes, and flags AML flags.
            </p>
            <div className="mt-3 flex justify-between items-center text-[10px]">
              <span className="text-gray-500 uppercase font-mono">Status</span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                activeAgent === "Investigator" 
                  ? "bg-yellow-500/20 text-yellow-400" 
                  : "bg-gray-800 text-gray-500"
              }`}>{activeAgent === "Investigator" ? "INVESTIGATING" : "STANDBY"}</span>
            </div>
          </div>

          <ArrowRight className="hidden lg:block w-6 h-6 text-gray-700" />

          {/* Agent 3: Auditor */}
          <div className={`glass-card p-5 rounded-xl w-64 border transition-all ${
            activeAgent === "Auditor" 
              ? "glow-active-auditor scale-105 border-indigo-500/80 bg-indigo-950/10" 
              : "border-gray-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeAgent === "Auditor" ? "bg-indigo-500/20 text-indigo-400 animate-pulse" : "bg-gray-800 text-gray-400"}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Auditor Agent</h4>
                <span className="text-xs text-indigo-400">DSQL Ledger Authority</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 line-clamp-2">
              Validates double-entry logs and commits verified transactions to multi-region shards.
            </p>
            <div className="mt-3 flex justify-between items-center text-[10px]">
              <span className="text-gray-500 uppercase font-mono">Status</span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                activeAgent === "Auditor" 
                  ? "bg-indigo-500/20 text-indigo-400" 
                  : "bg-gray-800 text-gray-500"
              }`}>{activeAgent === "Auditor" ? "COMMITTING" : "STANDBY"}</span>
            </div>
          </div>

        </div>
      </section>

      {/* FEEDS: INVOICES VS BANK TRANSACTIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* PENDING INVOICES */}
        <div className="glass-panel p-5 rounded-xl">
          <h3 className="text-md font-bold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Pending Sales Invoices (Accounts Receivable)
            </span>
            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-400">
              ERP Feed
            </span>
          </h3>
          <div className="overflow-y-auto max-h-80 space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="glass-card p-4 rounded-lg flex items-center justify-between border border-gray-800/40 hover:border-gray-700/50 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-200">{inv.invoiceNumber}</span>
                    <span className="text-xs text-gray-500">• {inv.vendor}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{inv.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                      inv.region === "us-east-1" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {inv.region}
                    </span>
                    <span className="text-[10px] text-gray-500">Issued: {new Date(inv.issueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm block">
                    {inv.currency === "EUR" ? "€" : "$"}{Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold mt-1.5 ${
                    inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-800 text-gray-400"
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-center text-gray-500 text-xs py-8">No invoices loaded.</p>
            )}
          </div>
        </div>

        {/* BANK TRANSACTIONS */}
        <div className="glass-panel p-5 rounded-xl">
          <h3 className="text-md font-bold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              Incoming Bank Deposits (Statement Stream)
            </span>
            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-400">
              ACH/Wire Feed
            </span>
          </h3>
          <div className="overflow-y-auto max-h-80 space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="glass-card p-4 rounded-lg flex items-center justify-between border border-gray-800/40 hover:border-gray-700/50 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-200">{tx.bankTxId}</span>
                    <span className="text-xs text-gray-500">• {tx.senderName}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                      tx.region === "us-east-1" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {tx.region}
                    </span>
                    <span className="text-[10px] text-gray-500">Date: {new Date(tx.transactionDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm block">
                    ${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold mt-1.5 ${
                    tx.status === "RECONCILED" 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : tx.status === "INVESTIGATING" 
                      ? "bg-red-500/10 text-red-500 animate-pulse border border-red-500/20"
                      : "bg-gray-800 text-gray-400"
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 text-xs py-8">No transactions loaded.</p>
            )}
          </div>
        </div>
      </section>

      {/* TERMINAL LOGS & RECONCILED LEDGER */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EXECUTION LOGS TERMINAL */}
        <div className="glass-panel p-5 rounded-xl flex flex-col h-96">
          <h3 className="text-md font-bold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Live AI Agent Execution logs
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-indigo-400">
              <RefreshCw className={`w-3 h-3 ${isRunning && "animate-spin"}`} />
              Realtime Stream
            </span>
          </h3>

          <div className="bg-black/90 p-4 rounded-lg font-mono text-xs text-gray-300 flex-1 overflow-y-auto space-y-2 border border-gray-800">
            {agentLogs.map((log) => {
              let agentColor = "text-indigo-400";
              if (log.agentName === "Matcher") agentColor = "text-emerald-400";
              if (log.agentName === "Investigator") agentColor = "text-yellow-500";
              if (log.agentName === "Auditor") agentColor = "text-indigo-400";

              let logColor = "text-gray-300";
              if (log.level === "WARN") logColor = "text-red-400";
              if (log.level === "SUCCESS") logColor = "text-emerald-400 font-semibold";

              return (
                <div key={log.id} className="leading-relaxed border-b border-gray-900/30 pb-1.5">
                  <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`${agentColor} font-bold mr-1.5`}>{log.agentName}:</span>
                  <span className={logColor}>{log.message}</span>
                </div>
              );
            })}
            
            {agentLogs.length === 0 && (
              <div className="text-center text-gray-600 py-24 italic">
                Awaiting workflow execution. Click "Trigger AI Reconciliation" to spin up the agent mesh.
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* LEDGER ENTRIES */}
        <div className="glass-panel p-5 rounded-xl h-96 flex flex-col">
          <h3 className="text-md font-bold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              General Ledger Bookkeeping (Prisma Committed)
            </span>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold text-emerald-400">
              Verified ACID Logs
            </span>
          </h3>

          <div className="overflow-y-auto flex-1 space-y-3">
            {ledgerEntries.map((entry) => (
              <div key={entry.id} className="glass-card p-3 rounded-lg border border-gray-800/30 hover:border-gray-800/70 transition-all flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-200">Reconciliation Log</span>
                    <span className="text-[10px] text-gray-500">• Committed by {entry.reconciledBy}</span>
                  </div>
                  <p className="text-xs text-indigo-400 mt-1 italic font-semibold">
                    {entry.auditComments || "Balanced automatically."}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-semibold">
                      {entry.auditStatus}
                    </span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
                      entry.region === "us-east-1" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                    }`}>
                      {entry.region}
                    </span>
                    <span className="text-[9px] text-gray-500">{new Date(entry.entryDate).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-xs text-emerald-400">
                    +${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
            
            {ledgerEntries.length === 0 && (
              <div className="text-center text-gray-600 py-24 italic">
                Ledger is empty. Reconcile transactions to write transactions to the distributed SQL shards.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
