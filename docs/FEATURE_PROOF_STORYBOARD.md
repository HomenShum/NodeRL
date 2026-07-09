# NodeRL Feature Proof Storyboard

This storyboard defines the public demo/proof shape for NodeRL. It is not a visual marketing script; it is the contract a future README clip, notebook, or trace viewer must satisfy before claiming that an agent run became reusable learning data.

## Proof Contract

The proof must show one complete episode:

1. **Goal** - the task or benchmark target is explicit, including whether it is certification-loop or exploration-loop work.
2. **Act** - the agent/tool/browser/PDF actions are recorded as a bounded trajectory.
3. **Observe** - UI state, files, tests, verifier responses, or screenshots are captured as evidence.
4. **Evaluate** - deterministic tests, official verifiers, media judges, user decisions, cost, and latency remain separate signals.
5. **Reward** - reward fields are derived from evidence, not from the model grading its own output.
6. **Remember** - failure and success facts become provenance-backed memory, not transcript folklore.
7. **Repair** - the next attempt is scoped to the observed failure and cannot self-promote to accepted.
8. **Export** - JSONL/SFT/DPO/RLVR export preserves task ids, trace ids, reward components, costs, and receipt links.

## Story Beats

1. **Episode entry** - show a single task id, goal, and initial state.
2. **Trace spine** - show NodeTrace step rows with action, observation, cost, and bounded status.
3. **Reward builder** - show the separated reward components from `spec/reward-design.md`.
4. **Memory handoff** - show NodeMem failure/success memory with repair targets.
5. **Repair loop** - show an attempted repair and the independent gate that decides whether it passed.
6. **Dataset export** - show exported records with trace/proof lineage and no answer-key leakage.

## NodeGraph Model

NodeGraph should render an episode as:

- `goal`
- `action`
- `observation`
- `verifier`
- `visual_judge`
- `reward_component`
- `memory`
- `repair`
- `export_record`
- `proof_receipt`

The graph must keep certification-loop receipts separate from exploration-loop proposals.

## NodeTasks Binding

NodeTasks includes this public task bundle:

- `public-node-repo-proofs`

Relevant NodeRL tasks:

- `noderl.episode-storyboard.v1`
- `noderl.reward-memory-export.v1`

Use those task ids when producing a public NodeRL demo or benchmark-style proof run.

## Validation Checklist

- `npm run typecheck`
- Verify `spec/proof-receipt-contract.md` still defines the receipt lanes.
- Verify `spec/reward-design.md` keeps reward components separated.
- Verify `spec/anti-cheat-doctrine.md` still blocks self-promotion and answer-key leakage.
- Verify exported examples cite task ids, trace ids, reward components, costs, and receipt links.
