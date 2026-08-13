# @noderl/nodeeval

Decide whether a run actually earned the claim it is making. Two kinds of check live here, and both
are pure functions — no file IO, no network, no clock, no randomness.

```ts
import { verifyTrialBalance, evaluateFullSuiteGate } from "@noderl/nodeeval";
```

## 1. Accounting oracles — was this worked answer right?

A grader needs to tell a correct reconciliation from a plausible-looking wrong one without a human
and without an answer key. Each oracle takes a worked answer and returns pass/fail plus the *named*
check that failed, so "wrong" is always attributable.

| Module | Function | Named checks it can fail |
|---|---|---|
| `src/accounting/trialBalance.ts` | `verifyTrialBalance` | `input_well_formed`, `debits_equal_credits`, `unknown_account_type`, `net_income_links_to_equity`, `balance_sheet_balances` |
| `src/accounting/bankReconciliation.ts` | `verifyBankReconciliation` | `ending_cash_tie`, `partition_covers_all_items` |
| `src/accounting/arApAging.ts` | `verifyAging` | `bucket_partition`, `bucket_sums_total`, `reserve_monotonic` |
| `src/accounting/journalEntry.ts` | `verifyJournalEntries` | `balances[entry N]`, `accounts_exist[entry N][line M]`, `no_negative[entry N][line M]` — indexed, so the failure points at the offending line |
| `src/accounting/cashFlowIndirect.ts` | `verifyCashFlowIndirect` | `operating_starts_from_net_income`, `net_change_ties_to_cash_balances` |

All five return the shared `VerifierResult` from `src/accounting/oracleTypes.ts`:
an overall `passed` plus the list of named `checks` behind it.

**The bar these are written to:** an oracle that always passes is a bug, so every test asserts
*both* directions — it must accept a good answer AND reject a bad one *by the right named check*.
See `test/accounting_*.test.ts`.

```ts
const result = verifyTrialBalance(input);
if (!result.passed) {
  const failing = result.checks.filter((c) => !c.passed).map((c) => c.name);
  // e.g. ["debits_equal_credits"] — which invariant broke, not just "it failed"
}
```

## 2. Proof gates — did the whole suite earn the claim?

One task passing is not a suite passing. A gate aggregates many task results into a single
blocked -> passed flip, and refuses to flip unless the receipts earn it.

| Module | Function | Question it answers |
|---|---|---|
| `src/bankerToolBenchEvalLedger.ts` | `buildBtbLedgerImport` | normalizes a raw benchmark sweep into the ledger shape the gates read |
| `src/bankerToolBenchFullSuiteGate.ts` | `evaluateFullSuiteGate` | did every task execute clean, and does every clean task carry an official score? |
| `src/bankerToolBenchLiveSuiteGate.ts` | `evaluateLiveSuiteGate` | does every task have a passing receipt from the live product UI? |

The full-suite gate reports **completion, mean reward and pass-rate separately** on purpose. "100
tasks executed and scored" is a different claim from "100 tasks passed", and collapsing the two is
the exact dishonesty these gates exist to prevent. See
[`../../spec/anti-cheat-doctrine.md`](../../spec/anti-cheat-doctrine.md).

## Known gap

The three gate modules have no tests. The five accounting oracles have thorough two-direction tests;
the gates do not. See [`../../docs/codebase/CONCERNS.md`](../../docs/codebase/CONCERNS.md).

## Provenance

These sources began life inside the NodeRoom application and were vendored here when NodeRL was
split out. This repository is now the canonical copy: edit it directly.
