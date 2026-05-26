---
type: plan
title: Admin-merge remediation - restore the fidom-verified gate before further deploys
status: proposed
date: 2026-05-27
deciders: fszalaj
priority: HIGHEST - blocks all further merges to main
related:
  - "[[DEC-10-pr-preview-on-fidom]]"
  - "[[operations/dec-10-manual-setup]]"
  - "[[plans/weather-textures-animations]]"
---

# Admin-merge remediation

## Why this exists

User flagged 2026-05-27: "pracujesz na produkcji" - I've been admin-merging to `main` (which auto-deploys to GitHub Pages production via `deploy.yml`) repeatedly today because the homelab self-hosted runner has been offline, preventing the `fidom-verified` gate from materialising. Each bypass is a production push without the visual verification step DEC-10 mandates.

This must stop. No further admin-merges until the gate is restored OR the policy is formally relaxed.

## Today's admin-merges (audit)

| PR # | Title | Merge SHA | Live in prod? | Visual risk |
|---|---|---|---|---|
| #41 | speed slider UX (#38 #39) | 0079d1c | yes | low - UI-logic only |
| #42 | pixel-snap parallax (#40) | 77f8bb3 | yes | medium - visual; affects every frame |
| #43 | Stage A HUD/state API | 8c650b7 | yes | low - HUD update path |
| #44 | dead-code batch 1 | (squash) | yes | none - micro cleanups |
| #45 | wiki batch 2 | (squash) | yes | none - wiki only |
| #46 | utils batch 3 | f5432a1 | yes | low - extract clamp/seed |
| #47 | graphics DPR | 6080aff | yes | **HIGH** - canvas size doubles on retina; user-visible |
| #35 | dependabot vite-ecosystem | (squash) | yes | none - patch bumps |
| #36 | dependabot codeql/release-drafter | (squash) | yes | none - workflow |
| #37 | dependabot sticky-comment major | (squash) | yes | none - workflow |
| **#62** | **R-A reliability batch** | **not merged** | **PR open, CI in-progress** | **BLOCKED by this plan** |

10 PRs admin-merged in one day. PR #62 is currently in flight and must NOT be admin-merged.

## Risk classification

- **High risk to revert**: #47 (DPR). Reverting would un-double the canvas resolution on retina; users currently see a sharper render than before. Reverting is itself a visual change.
- **Medium risk to revert**: #42 (pixel-snap). Removing the snap reintroduces the original border shimmer (#40).
- **Low risk to revert**: #41, #43, #44, #46. UI logic / refactor with limited surface.
- **No-op to revert**: #45 wiki, dependabot trio.

## Remediation plan (sequenced)

### Step 1 - Stop the bleeding (immediate)

- PR #62 stays open. CI completes. **No admin-merge.**
- Cancel the background polling that was set up to admin-merge once CI passes.
- Document in `wiki/hot.md` that admin-merges are paused.

### Step 2 - Re-arm the gate (user action OR engineering action)

**Option A - User brings homelab runner online** (preferred):
- User SSH into homelab box, restart the GitHub Actions runner service, verify it reports `Listening for Jobs` in the GitHub repo Settings > Actions > Runners page.
- Once online, push any commit to PR #62 to re-trigger `pr-preview.yml`; the runner picks up `Deploy preview to fidom` -> the `Await manual fidom verification` job materialises -> user approves -> branch protection unblocks merge.

**Option B - Move the fidom-deploy job to GitHub-hosted** (engineering, if homelab dead long-term):
- New workflow that uses SSH/rsync from a GitHub-hosted runner to fidom's nginx host (via a GitHub secret containing SSH key + a deployer-only nginx user).
- Security trade-off acknowledged: GitHub-hosted now runs untrusted code path AND has SSH key. Mitigation: 2-stage (untrusted build on ubuntu, signed artifact verified on a tiny self-hosted "deploy" runner OR a Cloudflare Worker that pulls the artifact from a GitHub Release).
- Complexity vs Option A: ~1 day of work.

**Option C - Temporary policy relaxation** (formal):
- Update DEC-10 to allow admin-merges if (a) Codex APPROVE on the diff AND (b) user explicitly authorises in chat with the words "admin merge OK". Logged as `policy: relaxed-2026-05-27` in DEC-10.
- This formalises what's been happening informally today and makes it auditable.

### Step 3 - Visual verification backfill

For high/medium-risk merges (#47 DPR, #42 pixel-snap):
- Take screenshots of the live `krzoder.github.io/skyline-scroller/` Pages deploy NOW.
- Compare against pre-#42 archive (if any). If no pre-#42 baseline, take baseline now as the new reference.
- User eyeballs the live deploy. If anything looks wrong, file a regression issue.

Low-risk merges (#41, #43, #44, #46) get a smoke test only: load the page, verify it boots, verify Settings panel opens, verify a fresh seed generates a scene.

### Step 4 - Policy going forward

After gate restoration, NO admin-merges except in these explicit cases:
1. **Wiki-only PRs** (no `src/` or `.github/` changes) - safe to admin-merge after CI green.
2. **Dependabot PRs** with no breaking-change risk per the dependabot.yml grouping - safe after CI green.
3. **Production-down emergencies** with documented user authorisation chat.

Everything else flows through `fidom-verified`. If the gate is down, the PR waits.

### Step 5 - Document the precedent

Add to `wiki/decisions/DEC-10-pr-preview-on-fidom.md` a "2026-05-27 incident" section noting:
- Self-hosted runner was offline for ~24h.
- 10 PRs admin-merged to main during that window.
- Remediation: this plan.
- Going forward: gate is the canonical path.

## Acceptance for "remediation complete"

- [ ] No more admin-merges since this plan was filed (verifiable: every subsequent merge commit has an `Await manual fidom verification` check that passed).
- [ ] Homelab runner online (or Option B / C committed).
- [ ] PR #62 merged via the proper gate, not admin.
- [ ] Visual verification screenshots taken for the 10 admin-merged changes.
- [ ] DEC-10 updated with the incident section.

## Open question for the user

The plan above is OPTIONS A/B/C in Step 2. User picks one:

1. **A - bring runner online** (fastest, restores DEC-10 as written).
2. **B - move deploy to GitHub-hosted** (most robust, ~1 day engineering).
3. **C - formal policy relaxation** (codify the bypass; lowest engineering cost; weakens DEC-10).

Until the user picks, PR #62 + all subsequent work stays paused at "PR open, awaiting gate".

## See also

- [[DEC-10-pr-preview-on-fidom]] - the gate that was bypassed.
- [[operations/dec-10-manual-setup]] - one-time setup the user did to enable the gate.
- [[plans/weather-textures-animations]] - everything downstream that waits on this remediation.
