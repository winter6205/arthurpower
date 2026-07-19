---
name: wayfinder
description: Use when a chunk of work is more than one agent session can hold — plan it as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
version: 1.0.0
tags: [Planning, Map, Tickets, FogOfWar, Orchestration, DecisionTracking]
related_skills: [deep-dive-protocol, domain-modeling]
disable-model-invocation: true
---

A loose idea has arrived — too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **shared map** on the repo's issue tracker, then works its **decision tickets** — questions whose resolution is a decision — one at a time until the route is clear.

The destination varies per effort; naming it is the first act of charting — it shapes every ticket. The map is domain-agnostic — engineering work, course content, whatever fits the shape.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear — nothing left to decide before someone does the work. The pull to just do the work signals you've reached the map's edge — time to hand off. An effort can override this in **Notes** to carry execution into the map; absent that, produce decisions, not deliverables.

## Refer by name

Every map and ticket has a **name** — its issue title. In everything the human reads, refer to it by name, never by bare id or slug. The id and URL ride *inside* the name, never stand in for it.

## The Map

The map is a single issue labelled `wayfinder:map` — the canonical artifact. Its tickets are child issues.

The map is an **index**, not a store. A decision lives in exactly one place — its ticket — so the map only gists and links.

**Where the map, its tickets, blocking, and frontier queries live is tracker-specific.** The tracker should have been provided — set one up if not; default to local-markdown.

### The map body

The whole map at low resolution, loaded once per session. Open tickets are found by query, not listed here.

```markdown
## Destination

<what reaching the end of this map looks like — the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [<closed ticket title>](link) — <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Each ticket is a **child issue** of the map; the tracker's issue id is its identity. Its body is the question, sized to one 100K token agent session:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Each ticket carries a `wayfinder:<type>` label: `research`, `prototype`, `grilling`, or `task`.

A session **claims** a ticket by assigning it to the dev, **first**, before any work, so concurrent sessions skip it. That assignee _is_ the claim: an open, unassigned ticket is unclaimed.

Blocking uses the tracker's **native** dependency relationship — it renders the frontier visually in the tracker UI, so the human sees what's takeable without opening the map. Only a tracker lacking native blocking falls back to a body convention. A ticket is **ready** when every ticket blocking it is closed; the **frontier** is the open, ready, unclaimed children — the edge of the known.

The answer is recorded on resolution (see [Work through the map](#work-through-the-map)). Assets created while resolving a ticket are linked from the issue, not pasted in.

## Ticket Types

Every ticket is either **HITL** — worked *with* a human who speaks for themselves — or **AFK**, driven by the agent alone. A HITL ticket only resolves through that live exchange.

- **Research** (AFK): Reading documentation, third-party APIs, or local resources like knowledge bases to surface a fact a decision waits on. Resolved by a research **subagent**. Use when knowledge outside the current working directory is required.
- **Prototype** (HITL): Raise the fidelity of the discussion by making a cheap, concrete artifact to react to — an outline, a stub, or UI/logic code as a rough prototype. Links the prototype as an asset. Use when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): Conversation via the arthurpower:deep-dive-protocol skill, one question at a time. The default case.
- **Task** (HITL or AFK): Manual work that must happen before a *decision* can be made — nothing to decide, prototype, or research, but the discussion waits until it's done. Signing up for a service so its API can be judged, provisioning access, moving data so its shape can be seen. This type *does* rather than decides — earning its place by clearing the path for a decision, not by delivering the destination. The agent drives it alone where it can (AFK); otherwise it hands the human a precise checklist (HITL). Resolved when the work is done; the answer records what was done and any resulting facts (credentials location, new URLs, row counts) later tickets depend on.

## Fog of war

The map is _deliberately_ incomplete: don't chart what you can't yet see. Beyond the live tickets lies the **fog of war** — decisions you can tell are coming but can't yet pin down, because they hang on questions still open. Resolving a ticket clears the fog ahead, graduating what's now specifiable into fresh tickets — until the way is clear.

The **Not yet specified** section holds that dim view: suspected questions, areas to revisit. Everything here is in scope, just not sharp enough to ticket. Write as loosely or fully as the view allows; it doubles as a signpost for where the effort is headed.

**Fog or ticket?** The test is whether you can state the question precisely now — _not_ whether you can answer it now.

- **Ticket when** the question is already sharp — even if it has prerequisites and you can't act on it yet.
- **Not yet specified when** you can't yet phrase it that sharply. Don't pre-slice the fog: it's coarser than a ticket, and one patch may graduate into several tickets, or none.

**Not yet specified** excludes what's already decided, what's already a live ticket, and what's out of scope.

## Out of scope

The destination fixes the scope. Work beyond it is **out of scope** — not fog, and not for **Not yet specified**. It gets its own **Out of scope** section: work consciously ruled out of _this_ effort. Scope, not sharpness, lands it here.

Out-of-scope work never graduates — the frontier stops at the destination — so it returns only if the destination is redrawn. When a ticket sits past the destination, **close it** and leave one line in **Out of scope**: gist plus why, linking the closed ticket. It stays out of **Decisions so far**, which records the route actually walked.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session** — with the exception of research tickets.

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Run a `arthurpower:deep-dive-protocol` session to pin down what this map is finding its way to — the spec, decision, or change. The destination fixes the scope, so it's settled first.
2. **Map the frontier.** Grill again, **breadth-first**: fan out across the whole space, surfacing open decisions and first steps takeable now. **If this surfaces no fog** — the way is already clear, the whole journey fits one session — you don't need a map. Ask the user how to proceed.
3. **Create the map** (label `wayfinder:map`): Destination and Notes filled in, Decisions-so-far empty, the fog sketched into **Not yet specified**.
4. **Create the tickets you can specify now** as child issues — then wire blocking edges in a **second pass** (issues need ids before they can reference each other). Wiring sorts them into the frontier and those with prerequisites; everything you can't yet specify stays in the fog — the **Not yet specified** section.
5. **Fire the research subagents.** For each `research` ticket you just created, spin up a research subagent to resolve it in parallel, capturing its findings on a throwaway `research/<name>` branch with a context pointer from the ticket.
6. Stop — charting is one session's work; it hand-resolves nothing.

### Work through the map

User invokes with a map (URL or number). A ticket is **optional** — without one, you pick the next decision, not the user.

1. Load the **map** — the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it**: assign it to yourself before any work.
3. Resolve it — **zoom as needed**: fetch the full body of any related or closed ticket on demand; invoke the skills the `## Notes` block names. If in doubt, use `arthurpower:deep-dive-protocol`.
4. Record the resolution: post the answer as a **resolution comment**, **close** the issue, and **append a context pointer** to the map's Decisions-so-far.
5. Add newly-surfaced tickets (create-then-wire); graduate fog the answer has made specifiable, clearing each graduated patch from **Not yet specified**. If the answer reveals a ticket sits beyond the destination, **rule it out of scope** rather than resolving it. If the decision invalidates other parts of the map, update or delete those tickets.

The user may run ready tickets in parallel, so expect other sessions to be editing the tracker concurrently.
