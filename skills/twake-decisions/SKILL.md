---
name: twake-decisions
description: Use when a decision is taken on a Twake/Cozy project, by a person or by you while working, and before asking a question or proposing a change.
---

# Decisions log (Twake / Cozy)

Every project keeps its decisions in a log, `docs/decisions.md`, versioned with the code. A decision missing from the log does not exist: the next agent or developer will not know it and will ask again, or undo it.

## Monorepos

In a monorepo (npm, yarn or pnpm workspaces, `apps/*`, `packages/*`), each package keeps its own log, `<package>/docs/decisions.md` (for example `packages/twake-mui/docs/decisions.md`), and the repository root has none.

- Search the log of the package you change, and the logs of the other packages your change reaches. In the other logs, also find the entries whose Scope line names your package (for example `grep -n "twake-mui" packages/*/docs/decisions.md`): a decision that touches several packages is written only once.
- Write a decision in the log of the package it touches. When it touches several, write it once, in the log of the main one, and name the others in its Scope line.
- Never create a `docs/decisions.md` at the root of a monorepo. A package with no log gets its own (see below).

## Before asking or proposing

Search the log before you ask a question, propose a change, or reopen a choice. If a decision answers it, follow the decision and cite it. To challenge it, say which entry you challenge and why; a new decision then replaces it (see below).

## What is a decision

A decision is a choice that binds more than the current change. Record it when either holds:

- someone other than you settled it: the product owner or a maintainer answers a question, the designer sets a rule, a review settles a point (a reviewer asks for X, the author agrees or argues, the outcome is the decision);
- it sets something a later change must respect: a behaviour the user sees, a contract with another app or service, the architecture, the infrastructure, a product or design rule.

Choices that stay inside the code of the change are not decisions, for example:

- naming a helper, or splitting a component into two files;
- picking `map` over a loop, or the order of two independent checks.

Write the entry in the log in the same commit (or at least the same PR) as the change it explains. A decision taken with no code change (a question answered, a change refused) gets its own commit.

Create the log if the project (in a monorepo, the package) has none, with a `# Decisions` title and one line saying it is append-only.

## Entry format

```markdown
## 2026-11-20, [UX] Moving a file to the trash shows Undo

- Decision: moving a file to the trash happens at once and shows a snackbar with an Undo action, with no confirmation dialog.
- Decided by: Alice Martin (design), [review comment](https://example.com/org/app/pull/42#comment-1)
- Why: the trash already makes the action reversible, so a dialog only slows the user down.
- Scope: desktop and mobile, file list and file viewer.
```

- Title: `## YYYY-MM-DD, [Category] short title`. The date is the day of the decision.
- Decision: one sentence, present tense, the rule as it now stands.
- Decided by: who settled it, and a link to the source (PR, issue, review comment, message). When the source has no public link (a call, a private chat), name the person, the channel and the date. When you settled it alone, write `agent (session <id or PR link>), to be confirmed by <who>`, naming the person who must confirm it (the maintainer, or the designer for UX and UI).
- Why: one line.
- Scope: desktop, mobile or both, and the screens or modules it covers. In a monorepo, also the other packages it touches.

A question still waiting for an answer is an entry too: title `## YYYY-MM-DD, [Category] Pending: short title`, the options instead of the decision, and who must decide. When it is settled, write a new entry whose Decision line starts with `Replaces the pending question of YYYY-MM-DD, "<title>".`

## Categories

Every entry has exactly one. When a decision spans two, take the one that dominates, or write two entries.

- UX: how the user goes through a task (flows, confirmations, defaults, focus). Example: a new message opened with its recipients puts the focus on the subject.
- UI: how something looks (colour, spacing, typography, icons, layout). Example: destructive actions show their label and icon in the error colour of the theme.
- Product: what the product does or does not do, and for whom. Example: remote images load by default, blocking them is a setting.
- Architecture: how the code is split and talks to other systems (modules, contracts, data flow). Example: apps reach each other through intents, never through direct calls.
- Infra: how it is built, deployed and run (CI, images, charts, environments). Example: the image reads its configuration from mounted JSON files.
- Tech: a library, tool or coding choice inside a module. Example: TanStack Query for server state, no Redux.

## Append only

Add entries at the end of the log and leave past entries as they are, wrong ones included. When a decision changes, write a new entry whose Decision line starts with `Replaces the decision of YYYY-MM-DD, "<title>".` The old entry stays as history.

## AGENTS.md line

Every project that follows this skill has this line in its `AGENTS.md`:

```markdown
- Decisions: `docs/decisions.md`, mandatory. Search it before asking a question or proposing a change; record every decision there, in the commit that applies it (skill `twake-decisions`).
```

A monorepo names where its packages live (`packages/*`, `apps/*`, or both) and has this line instead:

```markdown
- Decisions: each package keeps its own `docs/decisions.md` (`packages/*/docs/decisions.md`), mandatory, none at the repo root. Search the log of the package you change before asking a question or proposing a change; record every decision in the log of the package it touches (the main one when it touches several, the others in its Scope line), in the commit that applies it (skill `twake-decisions`).
```
