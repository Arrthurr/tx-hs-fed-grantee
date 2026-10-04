# Domain Docs

This repository uses a single-context domain-documentation layout:

- `GLOSSARY.md` at the repository root.
- Architecture decision records under `docs/adr/`.

## Before exploring

Read the glossary and ADRs relevant to the area being explored.

If they do not exist, proceed silently. Do not suggest creating empty
documents upfront. The domain-modeling skill creates them lazily as
terminology or decisions are resolved.

## Use the glossary’s vocabulary

Use defined domain terms in issue titles, proposals, hypotheses,
and test names. Avoid synonyms the glossary explicitly rejects.

If a needed concept is missing, reconsider whether it belongs to the
project’s language or note the gap for domain-modeling.

## Flag ADR conflicts

Explicitly surface any proposal that contradicts an existing ADR,
with the reason the decision should be reconsidered.
