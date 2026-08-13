/**
 * NodeEval — the public surface.
 *
 * Two things live here, and both answer the same question: "did the run actually earn
 * the claim it is making?"
 *
 * 1. ACCOUNTING ORACLES. Five deterministic verifiers. Each takes a worked answer and
 *    returns pass/fail with a NAMED failing check, so a wrong answer can be told apart
 *    from a right one without a human and without an answer key.
 *
 * 2. PROOF GATES. Aggregate many task results into a single flip: a claim moves from
 *    blocked to passed only when the receipts earn it.
 *
 * Every export is a pure function. No file IO, no network, no clock, no randomness —
 * the same input always produces the same verdict.
 */

/* ── The shared oracle contract ─────────────────────────────────────────────────────── */

/** Every verifier returns a VerifierResult: an overall pass/fail plus the named checks
 *  behind it. `summarize` builds one from a check list. */
export { summarize, type OracleCheck, type VerifierResult } from "./accounting/oracleTypes.ts";

/* ── The five accounting oracles ────────────────────────────────────────────────────── *
 * Listed by name rather than re-exported in bulk. Each oracle keeps its own cent-tolerance
 * constant and some keep their own line/entry shapes; those are module-internal on purpose,
 * so what appears below is the whole public surface and nothing leaks by accident.        */

export { verifyTrialBalance, type TrialBalanceInput, type Account, type AccountType } from "./accounting/trialBalance.ts";
export { verifyBankReconciliation, type BankReconciliationInput, type ReconciliationItem } from "./accounting/bankReconciliation.ts";
export { verifyAging, dayNumber, type AgingInput, type AgingInvoice, type AgingBucket } from "./accounting/arApAging.ts";
export { verifyJournalEntries, type JournalEntriesInput, type JournalEntryInput, type JournalLine } from "./accounting/journalEntry.ts";
export { verifyCashFlowIndirect, type CashFlowIndirectInput, type CashFlowLine, type CashFlowSection } from "./accounting/cashFlowIndirect.ts";

/* ── The proof gates ────────────────────────────────────────────────────────────────── */

/** Normalize a benchmark sweep into a ledger import — the shape the gates read. */
export {
  buildBtbLedgerImport,
  normalizeBtbSweepSummary,
  normalizeBtbSweepTask,
  toConvexBtbLedgerPayload,
  type BankerToolBenchSweepTask,
  type BankerToolBenchSweepSummary,
  type BtbLedgerTask,
  type BtbLedgerRun,
  type BtbLedgerImport,
  type ConvexBtbLedgerRunPayload,
} from "./bankerToolBenchEvalLedger.ts";

/** Did every task execute clean AND carry an official score? Reports completion, mean
 *  reward and pass-rate SEPARATELY, so "100 tasks scored" is never read as "100 passed". */
export {
  evaluateFullSuiteGate,
  evaluateFullSuiteGateFromSummaries,
  type FullSuiteGateOptions,
  type FullSuiteGateId,
  type FullSuiteSubGate,
  type FullSuiteGateVerdict,
} from "./bankerToolBenchFullSuiteGate.ts";

/** The same question for the live-UI lane: every task needs a passing per-task receipt. */
export {
  evaluateLiveSuiteGate,
  type LiveTaskResult,
  type LiveSuiteGateOptions,
  type LiveSuiteGateVerdict,
} from "./bankerToolBenchLiveSuiteGate.ts";
