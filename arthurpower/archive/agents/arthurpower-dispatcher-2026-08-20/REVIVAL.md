# Revival Conditions

Archived 2026-08-20. Fan-out lives on the `dispatching-parallel-agents` skill (current agent launches workers). This file was an extra orchestrator agent.

Restore only if a host requires a dedicated dispatcher _agent type_ (not a skill).

Steps:

1. Copy `arthurpower-dispatcher.md` back to `agents/`
2. Do not wire it from the skill; the skill stays the playbook
