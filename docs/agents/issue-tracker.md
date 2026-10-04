# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `Arrthurr/tx-hs-fed-grantee`.
Use the `gh` CLI from this repository. Outside the clone, specify
`--repo Arrthurr/tx-hs-fed-grantee`.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`.
  Use a file or heredoc for multiline bodies.
- Read: `gh issue view <number> --comments`.
  Fetch labels with `gh issue view <number> --json labels`.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
  Apply appropriate label and state filters.
- Comment: `gh issue comment <number> --body-file <file>`.
- Apply or remove labels: `gh issue edit <number> --add-label "..."`
  or `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

When a skill says “publish to the issue tracker,” create a GitHub issue.
When it says “fetch the relevant ticket,” read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, containing Notes,
  Decisions-so-far, and Fog.
- Child tickets: link to the map using GitHub sub-issues. If unavailable,
  use a task list in the map and a `Part of #<map>` line in each child.
  Label children `wayfinder:<type>`: research, prototype, grilling, or task.
- Blocking: use native GitHub issue dependencies. Add an edge with:
  `gh api --method POST repos/Arrthurr/tx-hs-fed-grantee/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`.
  Obtain the database ID with:
  `gh api repos/Arrthurr/tx-hs-fed-grantee/issues/<number> --jq .id`.
  If dependencies are unavailable, use `Blocked by: #<number>` lines.
- Frontier: open children with no open blockers and no assignee,
  ordered by their position in the map.
- Claim: `gh issue edit <number> --add-assignee @me`.
- Resolve: comment with the answer, close the ticket, and append
  a summary and link to the map’s Decisions-so-far.
