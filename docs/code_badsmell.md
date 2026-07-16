### **可直接交给 Claude Code 的工程化结构审查规则**

下面这份规则聚焦于**真正影响可维护性、正确性、测试性和智能体可靠性**的问题。它不要求为“看起来更优雅”而重构；只有异味带来明确工程风险时，才要求提出最小修复方案。

```md
# Structural Review Rules for Code and Agent Systems

## Goal

Review changes for structural problems that create concrete risk in:
- correctness;
- maintainability;
- testability;
- security and data boundaries;
- agent reliability, cost, and observability.

Do not recommend refactors solely for style, theoretical purity, or hypothetical future needs.
Prefer the smallest safe change that removes a demonstrated risk.

## Review Order

Review in this order:

1. Requirement fidelity
   - Does the implementation satisfy the ticket/spec and acceptance criteria?
   - Does it preserve explicitly required existing behavior?

2. Safety and reliability
   - Are authorization, input validation, error handling, retries, and side effects safe?
   - Are agent tool calls bounded, validated, and recoverable?

3. Structural quality
   - Identify code or agent-workflow smells only when they create a concrete risk.
   - For each finding, explain the evidence and propose a minimal safe correction.

## Findings Format

For every finding, use exactly this format:

- Severity: blocking | should-fix | optional
- Category: correctness | security | reliability | maintainability | testability | agent-workflow
- Location: file path and symbol, function, class, prompt, workflow, or configuration key
- Evidence: specific behavior, duplication, dependency, or failure mode
- Risk: what can break, diverge, become unsafe, or become costly
- Minimal safe change: smallest practical correction
- Verification: tests, evaluation cases, or observable behavior to add or update

Do not report a finding without concrete evidence.
Do not propose a broad rewrite when a local extraction, validation, schema, test, or boundary is sufficient.

## Code Structure Smells

Report the following only when they create one or more of the risks above.

### 1. Unclear or misleading names

Flag names that hide business meaning or lead to incorrect use.

Examples:
- generic names such as `data`, `result`, `handler`, `utils`, `flag`, or `process`;
- a boolean whose true/false meaning is unclear;
- a function named as a query that also mutates state;
- names that represent transport details rather than domain meaning.

Preferred correction:
- rename locally when the scope is small;
- introduce a domain-specific type or value object only when it prevents invalid use.

### 2. Duplicated business logic

Flag duplicated validation, authorization, state transitions, data mapping, error policy, or policy rules.

Do not flag intentionally repeated small presentation code.

Report duplication when a future policy or behavior change could produce inconsistent results across locations.

Preferred correction:
- centralize a shared pure function, policy module, validator, mapper, or state-transition function;
- keep call-site-specific behavior at the call site;
- add regression coverage that proves all consumers follow the same rule.

### 3. Data clumps

Flag parameters or fields that repeatedly travel together and represent one concept.

Examples:
- `tenantId`, `userId`, `projectId` repeatedly passed together;
- a tool execution function accepting many related timeout, retry, trace, and authorization fields;
- several prompt-construction functions taking the same context fragments.

Preferred correction:
- introduce a narrow, immutable request/context object with a meaningful name;
- do not create generic `Options`, `Context`, or `Data` objects that hide unrelated fields.

### 4. Primitive obsession at system boundaries

Flag raw strings, numbers, maps, or unvalidated JSON used for values with important domain constraints.

High-value examples:
- user identity, tenant identity, role, permission, model name, tool name, message role;
- money, timestamps, URL origins, file paths;
- agent actions, workflow states, confidence levels, output categories.

Preferred correction:
- validate and parse at the boundary;
- use enums, discriminated unions, branded IDs, schemas, or domain types;
- keep internal code operating on validated values.

### 5. Repeated branching over the same variant

Flag repeated `switch` / `if` logic over the same status, provider, tool type, event type, or workflow state when adding a new variant requires editing multiple unrelated files.

Preferred correction:
- consolidate ownership of the dispatch or transition logic;
- use a registry or handler map only when variants are stable and behavior is truly type-specific;
- keep simple local branching when it is isolated and easy to change.

### 6. Mixed responsibilities and divergent change

Flag a module when unrelated changes repeatedly require editing it.

High-value examples:
- one service contains authorization, persistence, prompt assembly, model invocation, response rendering, and analytics;
- one workflow file contains business decisions, retry policy, tool schemas, and UI messages.

Preferred correction:
- extract boundaries by reason to change, not by arbitrary layer names;
- prioritize extracting pure domain logic, policy checks, adapters, and side-effect orchestration;
- preserve the existing public interface unless a contract change is required.

### 7. Deep dependency chains

Flag code that depends on long object/property traversal or leaks internal object structure.

Examples:
- `request.session.user.organization.subscription.plan`;
- multiple services reading another module's internal state;
- a function that must understand several nested DTO shapes before it can act.

Preferred correction:
- expose a focused query or a normalized domain object at the boundary;
- pass only the data the consumer actually needs;
- do not add wrapper methods that merely forward calls without hiding meaningful complexity.

### 8. Unnecessary abstraction

Flag abstractions that have no current behavioral benefit and make the system harder to inspect, test, or modify.

Examples:
- factories, interfaces, plugin systems, generic frameworks, or multi-layer wrappers with one implementation;
- generic helper modules that conceal domain logic;
- excessive generic types that reduce readability.

Preferred correction:
- inline or collapse the abstraction;
- retain an interface only when it supports a real alternate implementation, external boundary, test seam, or independently changing subsystem.

## Agent-System Structural Smells

Treat prompts, tools, retrieval, workflow state, and evaluations as production code.
Review the following issues with the same evidence-and-risk standard.

### 1. Duplicated policy or prompt instructions

Flag policy, safety rules, product rules, tool-use constraints, or output requirements copied across agents or prompts.

Risk:
- one workflow is updated while another remains stale;
- agents provide contradictory answers or make different decisions under the same policy.

Minimal safe change:
- store shared policy in a versioned, reusable source;
- inject it into prompts through a controlled template or policy loader;
- keep agent-specific instructions local.

Verification:
- add shared-policy regression cases for every consuming agent.

### 2. God prompt

Flag a prompt that combines unrelated responsibilities into an unstructured block: role, product policy, tool protocol, safety rules, formatting, examples, workflow state, and exception handling.

Risk:
- instruction conflicts become difficult to detect;
- changes have unpredictable side effects;
- testing individual behaviors becomes difficult.

Minimal safe change:
- split instructions into named, composable sections;
- keep stable policy separate from task-specific context;
- keep tool contracts and output schemas outside prose where possible.

Verification:
- add focused evaluations for each separated responsibility.

### 3. Unvalidated tool boundary

Flag any tool invocation whose arguments or results are treated as trusted without schema validation.

Risk:
- malformed tool output causes incorrect actions;
- unchecked identifiers create cross-tenant or authorization errors;
- error objects or internal details leak into user-facing responses.

Minimal safe change:
- define strict input and output schemas;
- validate before invocation and parse results before use;
- map tool failures to explicit, safe error states.

Verification:
- test malformed inputs, malformed outputs, authorization failure, timeout, and retry exhaustion.

### 4. Unbounded or opaque tool loops

Flag workflows that can repeatedly invoke tools, retry failures indefinitely, or continue without an explicit completion condition.

Risk:
- runaway cost and latency;
- duplicated side effects;
- stalled conversations with no user-visible recovery path.

Minimal safe change:
- define maximum attempts, elapsed-time or budget limits, idempotency behavior, and stop conditions;
- record why the loop stopped;
- escalate to the user or a deterministic fallback when the budget is exhausted.

Verification:
- simulate repeated tool failure, partial success, duplicate calls, and unavailable dependencies.

### 5. Hidden or mutable workflow state

Flag behavior that depends on undocumented session memory, global mutable state, implicit conversation history, or non-versioned prompt state.

Risk:
- non-reproducible behavior;
- cross-user or cross-task contamination;
- failures that cannot be replayed or debugged.

Minimal safe change:
- define an explicit state schema;
- persist only required state;
- version state and prompt configuration;
- pass the smallest required state into each workflow step.

Verification:
- replay the same state and inputs; assert stable transitions and isolated sessions.

### 6. Context dumping

Flag workflows that inject full documents, long histories, raw tool output, or broad retrieval results into the model without selection and provenance.

Risk:
- context dilution, higher cost, privacy exposure, and unsupported conclusions;
- important evidence is buried among irrelevant content.

Minimal safe change:
- retrieve narrowly;
- extract only task-relevant sections;
- summarize or normalize long evidence;
- attach source identifiers and timestamps where decisions depend on retrieved facts.

Verification:
- test relevance under distractor documents, oversized histories, missing sources, and conflicting sources.

### 7. Agent decisions without an evidence or confirmation boundary

Flag autonomous actions that make business, customer, financial, destructive, or irreversible decisions without grounded evidence or an explicit user approval point.

Risk:
- hallucinated or unauthorized decisions;
- irreversible changes based on incomplete context.

Minimal safe change:
- require structured evidence for factual claims;
- expose assumptions and uncertainty;
- require user confirmation before irreversible actions;
- separate fact collection from decision-making.

Verification:
- add evaluations for missing evidence, conflicting evidence, low confidence, and rejected confirmation.

### 8. Missing evaluation coverage for behavior-critical changes

Flag changes to prompts, model selection, tool behavior, retrieval, policies, routing, or workflow state that lack targeted regression evaluations.

Risk:
- silent behavioral regressions despite passing unit tests;
- quality, safety, or cost degradation reaches production undetected.

Minimal safe change:
- add a small, representative evaluation set tied to the changed behavior;
- define expected tool calls, expected structured output, safety constraints, and acceptable failure behavior;
- include at least one negative and one edge case.

Verification:
- run evaluations before merge and record baseline versus changed results.

## Severity Guidance

Use `blocking` when the issue can cause:
- security or authorization failure;
- data loss, duplicated irreversible side effects, or cross-tenant access;
- unbounded tool cost or execution;
- a clear violation of the ticket/spec;
- unsafe user-facing behavior.

Use `should-fix` when the issue is likely to cause:
- inconsistent business behavior;
- high maintenance cost;
- poor testability or non-reproducible agent behavior;
- workflow fragility under ordinary changes.

Use `optional` only when:
- the improvement is low-risk and clearly beneficial;
- no immediate correctness, security, reliability, or substantial maintenance risk exists.

## Refactoring Constraints

- Preserve public contracts unless a contract change is explicitly required.
- Prefer pure functions for business rules and state transitions.
- Keep side effects at explicit boundaries.
- Validate external data at entry points.
- Do not introduce a framework, registry, hierarchy, or generic abstraction without a present, demonstrated need.
- Do not extract code merely because it is long; extract it when it has a distinct responsibility, repeated use, or independent test value.
- When no material structural issue exists, explicitly report: `No structural findings requiring change.`
```

### **推荐的使用方式**

把这份内容作为 Claude Code 的审查规则，而非每次实现任务的强制开发模板。实现阶段可以轻量遵守；在完成 ticket 后，要求它额外执行一次结构审查：

```md
After implementing the task, run a structural review using the repository's
Structural Review Rules. Report only findings with concrete evidence and a
demonstrated engineering risk. Apply only blocking findings automatically;
ask before applying should-fix refactors unless they are strictly local and
behavior-preserving.
```

这样能避免两个常见问题：一是智能体为了“消灭异味”进行无谓重构；二是 AI 应用中真正关键的结构问题——工具边界、状态、上下文、评测与不可逆操作——被传统代码审查遗漏。

