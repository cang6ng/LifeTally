---
name: architecture-design-before-coding
description: Architecture-first workflow for feature requests, refactors, system redesigns, module extensions, or implementation requests where Codex should inspect the existing project, design module boundaries, data flow, interface contracts, risk controls, and test criteria before writing code. Use when the user asks to build, change, expand, or restructure software and architecture clarity matters before implementation.
---

# Architecture Design Before Coding

## Core Rule

Design before implementing. Do not start with code unless the user explicitly asks for immediate implementation and the change is small enough that architecture risk is negligible.

Before implementation, produce an architecture plan that is clear enough for another engineer or agent to execute without inventing missing decisions.

## Principles

- Inspect the existing project before designing. Do not invent an architecture in isolation.
- Preserve conceptual integrity. Reuse established naming, boundaries, data models, and local patterns when they exist.
- Define interfaces before implementation details. State inputs, outputs, dependencies, state changes, errors, and forbidden responsibilities.
- Keep modules atomic. Avoid god modules, all-purpose functions, and UI components that own business rules.
- Separate mechanism from policy. Keep reusable mechanics stable and put variable business rules in strategies, config, or edge adapters.
- Keep core complexity low. Move compatibility, third-party integration, migration, and transformation complexity to edges.
- Avoid overengineering. Prefer the simplest design that is clear, testable, and able to evolve.

## Workflow

### 1. Restate Need And Goal

Briefly state:

- What the user wants to achieve.
- What problem it solves.
- The expected final behavior.
- Whether it is a feature, refactor, fix, architecture change, or UX change.

If details are missing, make explicit assumptions. Ask the user only when missing information would lead to materially different architecture.

### 2. Inspect Current Structure

Read relevant project files before proposing the design:

- Entrypoints and route/view structure.
- Existing modules and ownership boundaries.
- Types, stores, services, APIs, persistence, and tests.
- Existing naming conventions and reusable helpers.

The plan must fit the current system instead of replacing it with a generic architecture.

### 3. Identify Impact Scope

Cover each relevant layer:

- UI / View.
- State / Store.
- Service / Domain.
- API / Controller.
- Storage / Database.
- Type / Model.
- Test / Docs.
- Config, scripts, or external dependencies.

For each touched layer, state what changes, why, the boundary, and the risk.

### 4. Design Module Boundaries

For each module, specify:

- Name and expected location.
- Core responsibility.
- Responsibilities it must not own.
- Inputs and outputs.
- Dependencies and callers.
- Whether it is independently testable.

List recommended new files and existing files to modify only when the paths are needed to avoid ambiguity.

### 5. Define Data And State Flow

Describe the complete path from user action or external input to final state:

```text
User action
-> UI event
-> state update
-> domain/service logic
-> persistence or external side effect
-> result/error
-> UI refresh
```

State where data is validated, transformed, persisted, and how errors return to the UI.

### 6. Define Interface Contracts

For key modules, define signatures or structured contracts. Include:

- Function or method names.
- Parameters and return values.
- Sync/async behavior.
- Side effects.
- Error types or failure meanings.
- State changes.
- Boundary conditions.
- Migration or compatibility needs for data model changes.

Use concise pseudocode or TypeScript-style types when useful, but do not write full implementation code.

### 7. Assess Complexity And Risk

Include explicit risk controls for:

- New dependencies.
- Broken existing interfaces.
- Duplicate logic or multiple sources of truth.
- Increased core complexity.
- Historical data compatibility.
- Test impact.
- Performance risk.
- State inconsistency.
- Migration risk.
- User experience regression.

Each risk needs a mitigation.

### 8. Plan Implementation Order

Break work into independently verifiable phases:

1. Types and interfaces.
2. Core domain/service logic.
3. State integration.
4. UI integration.
5. Persistence or external integration.
6. Tests.
7. Documentation.
8. Regression verification.

For each phase, state the goal, touched files or areas, completion criteria, and how to validate it.

### 9. Define Tests And Acceptance Criteria

Include:

- Unit tests.
- Integration tests.
- Edge case tests.
- Regression tests.
- Manual validation paths.

Acceptance criteria must be concrete, such as:

- Given input A, return B.
- When state changes from X to Y, UI shows Z.
- When an operation fails, the error is recorded and a specified message appears.
- When old data misses a new field, the system applies a compatible default.

## Final Architecture Plan Format

Use this structure unless the user requested a different one:

1. Requirements Understanding
2. Current Structure Assessment
3. Impact Scope
4. Recommended Architecture
5. Module Responsibilities
6. Data Flow And State Flow
7. Interface Contracts
8. File Change Plan
9. Complexity And Risk Controls
10. Implementation Steps
11. Tests And Acceptance Criteria
12. Explicitly Out Of Scope
13. Questions For User Confirmation

## Self-Check Before Output

Before finalizing the plan, verify:

- The design fits the existing project style.
- The requirement is placed in the correct layer.
- No layer owns responsibilities that belong elsewhere.
- Rules are not duplicated.
- No unnecessary dependencies are introduced.
- Core modules are not polluted by edge complexity.
- Variable policy is not hardcoded into stable mechanisms.
- Interfaces and failure semantics are clear.
- Tests and validation paths are concrete.
- The design is simple enough for the current stage.

If any item fails, revise the plan before presenting it.
