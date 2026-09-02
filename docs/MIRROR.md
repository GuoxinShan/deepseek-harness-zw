# Cursor-cloud mirror

This repository (`GuoxinShan/deepseek-harness-zw`) is a **push mirror** of
[aka-danielZhang/deepseek-harness](https://github.com/aka-danielZhang/deepseek-harness)
(`+zw`) for Cursor cloud agents.

It is **not** a GitHub fork of
[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
GitHub refuses a second fork in the same network because
`GuoxinShan/deepseek-harness` already forks the official repo.

## History

`master` follows Daniel's `master`, including history. The tip of this
`master` is Daniel's `master` plus one overlay commit that adds:

- this file
- a short note at the top of `README.md`
- `.github/workflows/sync-upstream.yml`

The overlay's parent is
`613fd43f19768d637701d79f1b2fd6099f135895` (`aka-danielZhang/deepseek-harness`
`master` at mirror setup). Compare with:

```sh
gh api repos/aka-danielZhang/deepseek-harness/commits/master --jq .sha
git rev-parse HEAD^
```

Default branch should be `master`. The GitHub App token used to seed this
mirror cannot change repository settings (`default_branch` update returned
403). Until that is switched in GitHub Settings → General → Default branch,
`main` is pointed at the same overlay commit so the workflow file is live
on the current default branch.

## Sync

A Cursor GitHub listener on `aka-danielZhang/deepseek-harness` (`pr-merged` /
`ci-passed` on `master`) dispatches this repo's sync workflow with
`repository_dispatch` type `upstream-sync`. You can also run it with
`workflow_dispatch`. There is no cron / `on: schedule`.

The workflow fetches
`https://github.com/aka-danielZhang/deepseek-harness.git` `master` and
**fast-forwards** this repo's default branch only (`git merge --ff-only`).
It never force-pushes. If the branches have diverged, the job fails instead
of smashing local work.

Because this overlay commit sits on top of upstream, the first time Daniel's
`master` moves the fast-forward will fail until the overlay is rebased onto
the new tip (still without force-pushing established history).
