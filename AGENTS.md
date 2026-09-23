# AGENTS.md - Engineering Collaboration Charter

`AGENTS.md` is a first-class repository artifact and the highest repository-level
engineering governance document. It defines how requirements are understood, Specs
are established, code is changed, results are verified, and knowledge is retained.
Product facts, feature status, and domain-specific implementation contracts belong
in domain documentation.

This charter applies to every AI agent and human contributor. No task may implicitly
bypass it unless the user explicitly amends the rule for that task.

## 1. Normative Language and Scope

The key words in this document are normative:

- **MUST**: required. Work cannot advance while the rule is unmet.
- **SHOULD**: the default. A deviation requires a stated reason, impact, and compensating verification.
- **MAY**: optional when it does not weaken a higher-priority rule.

These rules apply across the repository. A closer `AGENTS.md` in a subdirectory MAY
add or tighten local rules, but it MUST NOT silently weaken this charter.

### 1.1 Responsibility Boundaries

- The user's request defines the goal, scope, and acceptance intent.
- `AGENTS.md` defines the engineering process, quality floor, and delivery discipline.
- `DOCS.md` and its indexed documents define domain facts, architecture decisions, and operating procedures.
- OpenAPI, JSON Schema, type definitions, and other machine-readable contracts define executable boundaries.
- Code and tests are evidence of present behavior. They do not override a confirmed Spec when they conflict with it.

### 1.2 Conflict Resolution

When sources conflict, first classify the conflict as goal, process, or domain fact,
then apply these rules:

1. Explicit decisions confirmed by the user for the current task override historical requirement prose.
2. Repository-level engineering work MUST follow this charter. Historical code conventions are not an exemption.
3. Domain facts come from the authoritative document or versioned machine contract declared for that domain.
4. Existing code, tests, and obsolete implementations are evidence only. They are not default sources of truth.
5. A material ambiguity that repository evidence cannot resolve MUST be confirmed before coding.

### 1.3 Working and Communication Language

- This file MUST be written and maintained entirely in English.
- Agents MUST perform private reasoning, planning, and technical analysis in English.
- Private chain-of-thought MUST remain private. Communicate decisions, evidence, assumptions, and outcomes instead.
- User-facing progress updates and final responses MUST be in Chinese unless the user explicitly requests another language.
- Source code, identifiers, comments, commit messages, and domain documents MUST follow their established local conventions.

## 2. North Star and Design Principles

The repository north star is:

> Deliver the smallest complete solution that is correct end to end, objectively
> verified, easy to understand, and durable enough to extend.

Decision priority is:

```text
Verified correctness and long-term maintainability
> system coherence and simplicity
> local diff size
```

### 2.1 Core Engineering Principles

1. **Evidence before assumptions**: read the governing Spec, inspect contracts, and run existing checks before deciding.
2. **Explicit boundaries**: inputs, outputs, errors, state, side effects, and external calls MUST be describable and testable.
3. **Deterministic rules in code**: validation, mapping, authorization, state transitions, and combinations MUST not be guessed by probabilistic systems.
4. **Explainable failure**: no swallowed errors, fabricated success, silent degradation, or hidden fallback.
5. **Focused changes**: do not perform unrelated refactors, formatting, dependency upgrades, or metadata churn.

### 2.2 Architecture and Evolution

1. **Do not preserve backward compatibility.** Remove obsolete paths instead of adding
   compatibility layers, fallbacks, shims, dual-write behavior, legacy modes, or migrations.
   Update all active callers and tests to the current contract in the same change.
2. **Choose the simplest implementation that fully meets the current requirements.**
   Avoid speculative abstractions, configuration, extension points, factories, and indirection.
3. **Grow the system in layers.** Start with the smallest version that works end to end.
   Add each capability on top of a product that already works. Never trade a working
   product for unfinished complexity or half-built infrastructure.
4. **Keep components modular and concerns clearly separated.** Parsing, validation,
   domain decisions, orchestration, persistence, and external I/O SHOULD have explicit boundaries.
5. **Prefer established, well-maintained libraries** when they reduce total complexity
   or improve reliability. Do not reimplement common functionality without a clear,
   documented reason.
6. **Lean on dependencies already present in the project** before writing a custom
   implementation or adding a package. Do not assume a library lacks a capability
   without checking its documentation, exported API, and types.
7. **Make architectural decisions for the long term.** Do not accept a stopgap that
   only works for now and is intended to be replaced later. The smallest solution
   MUST still be a durable production layer, not a disposable prototype.

## 3. Mandatory Gates Before Coding

Every code change MUST pass this section before implementation begins. A non-trivial
task records the result in a construction plan. A small task performs the same checks
in working context.

### 3.1 Repository and Worktree Gate

1. Read this file completely and read any closer `AGENTS.md` in the target directory.
2. Inspect `git status` and distinguish user changes, task changes, and generated artifacts.
3. Do not overwrite, revert, delete, or commit changes whose ownership is unclear.
4. Cleanup is limited to drafts and temporary artifacts confirmed to belong to the task.
   A dirty worktree is never permission to delete user work.

### 3.2 Spec Discovery Gate

1. Use `DOCS.md` to locate the relevant product, architecture, API, data, testing, and operations documents.
2. Read all directly relevant documents, machine contracts, configuration, existing tests, and module entry points.
3. Search for callers, callees, shared types, persistence effects, and adjacent constraints.
4. Do not use archived, deprecated, or historical systems as default implementation sources unless the active Spec explicitly requires it.
5. When documentation or contracts are incomplete, establish an executable Spec before deriving behavior from code.

### 3.3 Spec Brief

Before coding, produce a minimum Spec Brief containing:

- **Objective**: the observable behavior that will change.
- **Authority**: governing documents, contracts, versions, and confirmed user decisions.
- **Scope**: in-scope behavior, out-of-scope behavior, and explicit non-goals.
- **Contract**: inputs, outputs, errors, state, side effects, external calls, timeouts, retries, and data lifecycle.
- **Invariants**: security, idempotency, ordering, quantity, performance, and active-contract requirements.
- **Unknowns**: unresolved facts and whether each one blocks work.
- **Acceptance evidence**: tests, checks, screenshots, metrics, or controlled human review that prove completion.

If an unknown can materially change public behavior, data meaning, security boundaries,
or architectural direction, coding MUST pause until it is resolved.

### 3.4 Planning Gate

A cross-file feature, public API change, architectural change, data model change, or
major refactor is non-trivial and MUST:

1. Create a temporary `plans/<task_name>.md`.
2. Register it in `PLANS.md`.
3. Record the Spec Brief, impact surface, implementation order, rollback path, and verification commands.
4. Limit work to investigation, validation, and Spec improvement until all pre-coding gates pass.

## 4. Spec-Driven Development

1. **Contract first**: update the authoritative Spec or machine contract before implementing a changed public behavior.
2. **Single source of truth**: an enum, state, or business rule MUST have one declared source and a deterministic derivation path.
3. **Traceability**: implementation branches and tests SHOULD map to contract clauses or acceptance conditions.
4. **Reject undeclared behavior**: unknown fields, illegal states, invalid combinations, and unsupported capabilities MUST fail explicitly.
5. **Declare side effects**: network calls, writes, charges, messages, and retries MUST have specified counts and failure semantics.
6. **Replace obsolete contracts directly**: remove the old contract and its dead consumers. Do not add transitional compatibility paths.
7. **Keep Spec and implementation synchronized**: when implementation work exposes a Spec defect, correct the Spec first and record why.

## 5. Coding Standards

### 5.1 Design and Structure

- Follow sound existing module boundaries, naming, and tooling when they remain consistent with the active Spec.
- Add an abstraction only when it removes demonstrated complexity or meaningful duplication.
- Separate parsing, validation, and mapping from I/O and other side effects.
- Stable internal models SHOULD isolate domain logic from external service details.
- Prefer cohesive modules with narrow public surfaces and explicit ownership.

### 5.2 Dependencies and Libraries

- Inspect the current dependency manifest, lockfile, library documentation, and available types before implementing common functionality.
- Prefer a dependency already used by the repository when it satisfies the requirement cleanly.
- Add a new dependency only when its reliability and complexity benefit outweigh its maintenance, security, and bundle cost.
- Choose maintained libraries with clear ownership, releases, documentation, and an appropriate license.
- Do not hand-roll standard parsers, protocol clients, validation engines, security primitives, or domain algorithms without a recorded reason.
- Remove a dependency when its only consumer is removed. Do not keep packages for hypothetical future use.

### 5.3 Implementation Quality

- Names MUST express domain meaning. Avoid unexplained abbreviations, boolean traps, and cross-layer shared mutable state.
- Errors MUST have stable types, explicit status, and sanitized messages. Never convert an unknown failure into success.
- Retries, caching, and fault tolerance exist only when the active Spec explicitly requires them and tests prove their semantics.
- Comments explain non-obvious constraints, reasons, and risks; they do not narrate the code.
- Remove superseded code once all active callers are updated. Do not retain backup branches or commented-out implementations.
- Never hard-code a special case only to satisfy a fixture. A rule MUST explain the intended input domain.

### 5.4 Security and Data

- Revalidate every external input at the server boundary for type, size, format, authorization, and field dependencies.
- Tokens, secrets, personal data, raw media, sensitive payloads, local paths, and upstream error bodies MUST NOT enter logs or public errors.
- Credentials come only from controlled server-side configuration. They MUST NOT appear in code, fixtures, frontend artifacts, or commit history.
- File paths, URLs, command arguments, and deserialized data MUST be constrained against traversal, injection, and resource exhaustion.
- Deletion, overwrite, destructive schema changes, and bulk writes require an exact target plus a recovery or rollback strategy.

## 6. Verification and Feedback Loops

Verification depth MUST match risk and blast radius. At minimum, verify the changed
path and its failure modes.

1. **Baseline checks**: formatting, static analysis, type checking, unit tests, and relevant contract validation.
2. **Boundary checks**: missing input, invalid combinations, limits, timeouts, duplicate requests, upstream failure, and authorization errors.
3. **Side-effect checks**: assert the count, order, and idempotency of calls, writes, messages, retries, and billable operations.
4. **Integration checks**: when modules, protocols, or persistence boundaries change, test the real boundary rather than mock internals alone.
5. **Regression checks**: run existing tests for affected modules and every consumer of a changed shared contract.
6. **Evidence recording**: report commands actually run, their results, and anything not run. Never claim an unexecuted check passed.

Specialized work also requires:

- **Frontend/UI**: run the real page in a browser and inspect target viewports, interaction states, data states, and console errors.
- **Algorithms/models**: fix a baseline first, compare before and after on one consistent dataset, and reject sample-specific overfitting.
- **Performance work**: profile before changing code and prove the result with a repeatable benchmark.
- **External services**: mock success proves only the local contract. Real interoperability, cost, and quality require controlled integration evidence.

## 7. Documentation Boundaries

`AGENTS.md` contains only stable engineering rules that apply across tasks. It MUST NOT contain:

- Current feature completion, backlog, release dates, temporary decisions, or construction progress.
- Domain fields, workflow nodes, resource IDs, environment variables, or provider contracts.
- Results, commit details, or residual risks from a particular task.
- Implementation details better represented by code, Schema, PRD, ADR, Runbook, or plan.

Documentation responsibilities are:

- `DOCS.md`: the durable knowledge index. It does not duplicate document bodies.
- `docs/`: product requirements, architecture, ADRs, API guides, evaluation baselines, and operations manuals.
- Machine-readable contracts: executable fields, states, protocols, and data boundaries.
- `PLANS.md` and `plans/`: temporary construction plans and active status.
- Git commits: durable records of completed decisions, verification, and residual risks.
- Code comments: local implementation reasons that cannot be made clear through code alone.

Changes to a public API, critical business rule, architecture boundary, or operating
procedure MUST update durable documentation and the `DOCS.md` index in the same task.

## 8. Multi-Feature Worktree Orchestration

When a user introduces multiple new features in one session, the coordinating agent MUST
split the request into feature-sized work items before implementation. A single feature
continues in the current session unless the user asks for a separate worktree.

1. **Establish shared requirements first.** The coordinator MUST identify dependencies,
   shared contracts, ordering constraints, and acceptance conditions across the requested
   features. Material ambiguities remain subject to Section 1.2 and Section 3.3.
2. **Group by implementation affinity.** Features that share contracts, core modules, or
   an inseparable implementation and verification path SHOULD be grouped into one worktree.
   Independent features MUST use separate worktrees so their changes and verification can
   proceed independently.
3. **Use Orca for orchestration.** Worktrees and their agent sessions MUST be created and
   managed through Orca CLI. Contributors MUST NOT substitute raw `git worktree`, ad hoc
   terminal sessions, or untracked agent sessions for Orca-managed worktree orchestration.
4. **Use one dedicated agent session per worktree.** Each worktree MUST have a separately
   opened agent session with a bounded task, its Spec Brief, relevant document authority,
   file or module boundaries, dependencies, and acceptance evidence. The coordinator MUST
   retain responsibility for the overall requirements and integration.
5. **Sequence dependent work.** When one feature changes a contract or foundation required
   by another, the coordinator MUST establish and communicate that contract before dependent
   implementation proceeds. Parallel work MUST NOT invent incompatible shared interfaces.
6. **Review before integration.** The coordinator MUST inspect each worktree's diff, reported
   verification, and remaining risks before integrating its changes. Conflicts and cross-feature
   regressions MUST be resolved and verified in the integration worktree.
7. **Report the result.** The final handoff MUST identify the worktree-to-feature mapping,
   integration status, checks actually run, and any unfinished work or risks.

