---
name: DEC-10 manual setup TODO
description: One-time repo settings the owner must apply in the GitHub UI for the fidom approval gate to actually block merges.
type: operation
status: pending
date: 2026-05-20
related:
  - "[[decisions/DEC-10-pr-preview-on-fidom]]"
---

# DEC-10 manual setup TODO

PR [#33](https://github.com/krzoder/skyline-scroller/pull/33) shipped the
workflow + docs, but **two settings have to be applied in the GitHub UI by
the repo owner** before the approval gate actually blocks anything.
Without them, the new `pr-preview.yml` still builds + deploys to fidom,
but `await-approval` will fail (environment does not exist) and the
merge button is not gated by it.

## Step 1 - create the `fidom-verified` environment

- [ ] Open `https://github.com/krzoder/skyline-scroller/settings/environments`.
- [ ] Click **New environment**.
- [ ] Name: `fidom-verified` (exact, no typos - the workflow YAML references this string).
- [ ] Under **Deployment protection rules**, tick **Required reviewers** and add yourself (`fszalaj`).
- [ ] (Optional) Wait timer: 0 (default).
- [ ] **Save protection rules**.

> GitHub Environment approval allows the PR author to self-approve their own
> deployment. This is intentional and the reason we use Environment rather
> than PR review approval (which forbids self-approve and would deadlock a
> solo repo).

## Step 2 - branch protection rule on `main`

- [ ] Open `https://github.com/krzoder/skyline-scroller/settings/branches`.
- [ ] Click **Add branch protection rule** (or edit the existing rule for `main`).
- [ ] Branch name pattern: `main`.
- [ ] Tick **Require status checks to pass before merging**.
- [ ] Tick **Require branches to be up to date before merging** (recommended; prevents merging a stale PR whose preview no longer matches main).
- [ ] In the status checks search box, find and add: `Await manual fidom verification`.
  - This is the job display name from `pr-preview.yml`. The check will only appear after the workflow has run at least once on a PR - if you can't see it yet, open a test PR first to populate the available-checks list, then come back here.
- [ ] **Create / Save changes**.

## Smoke test (after Step 1 + Step 2)

- [ ] Open a trivial draft PR (e.g. typo fix in a comment).
- [ ] Wait ~2 min - sticky comment appears with `https://skyline-scroller.fidom.link/` and the approval link.
- [ ] Visit fidom, confirm the change is visible.
- [ ] Confirm the PR's **Squash and merge** button is greyed out / shows "Required: 1 status check pending".
- [ ] Go to **Actions → latest PR Preview run for this PR**, click **Review deployments → fidom-verified → Approve and deploy**.
- [ ] Merge button unlocks. Squash-merge.
- [ ] After merge, the workflow's cleanup jobs run: fidom rebuilds from main.

## When this page can be deleted

When all checkboxes above are ticked AND the smoke test passes once. At
that point the operational setup is complete and lives in repo settings;
no further action needed unless the repo is re-created or settings are
ever reset.
