---
name: github-ticket-implementation-planner
description: Plan implementation from a GitHub ticket by clarifying missing requirements, asking explicit questions for ambiguities, analyzing the codebase, and producing a concrete execution plan. After manual approval, publish the approved plan as a comment on the GitHub issue. Use when the user asks to plan work from a GitHub issue, ticket, or task description.
---

# GitHub Ticket Implementation Planner

## Core Prompt (Verbatim)
Read ticket description.
Highlight not clear or missing requirements, ask questions.
Analyze code base and build implementation plan.

## Workflow
1. Read the ticket description and extract goals, scope, constraints, acceptance criteria, and non-functional expectations.
2. Identify unclear, conflicting, or missing requirements.
3. Ask clarifying questions before finalizing the plan whenever requirements are ambiguous or incomplete.
4. Analyze relevant code paths, architecture boundaries, dependencies, and existing patterns in the repository.
5. Produce an implementation plan with clear, ordered steps and file-level impact.
6. Wait for manual approval of the plan before publishing it externally.
7. After manual approval, post the approved plan to the related GitHub issue as a comment.

## Clarification Gate (Strict)
- Do not finalize an implementation plan if requirements are ambiguous.
- List open questions explicitly and request answers first.
- If assumptions are unavoidable, keep them minimal and clearly labeled.

## Output Format
Use this structure:

```markdown
## Open Questions
- Question 1

## Assumptions
- Assumption 1

## Implementation Plan
1. Step 1
2. Step 2

## Risks / Dependencies
- Risk or dependency 1
```

If there are no open questions, omit the `Open Questions` section entirely.

## Publishing Rule
- Never post a draft plan.
- Post to GitHub issue comments only after the user confirms manual approval.
