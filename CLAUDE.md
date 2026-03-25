# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

RightCapital's centralized repository for reusable GitHub Actions. Currently contains `nx-release`, `nx-release-pr`, and `nx-release-auto-plan` — a set of actions for managing releases in Nx monorepos via version plans.

## Build & Development Commands

```bash
pnpm install              # Install dependencies
pnpm run build            # Build all actions (nx run-many -t build)
pnpm -w change            # Create a version plan (nx release plan)
pnpm -w check             # Run all quality checks (lint, format, typecheck) in parallel
```

Each action is built individually with `rslib build` into `dist/index.js` (CJS bundle). The `dist/` directories are committed because GitHub Actions requires built JS in the repo.

## Architecture

- **Nx workspace** with pnpm, using `@nx/js/typescript` plugin for build/typecheck targets
- **Three actions** in a fixed release group (always same version):
  - `nx-release/` — Creates git tags + GitHub releases (+ optional npm publish) after a release PR merge
  - `nx-release-pr/` — Creates/updates release PRs with version bumps from `.nx/version-plans/`
  - `nx-release-auto-plan/` — Auto-generates Nx version plans from commit bump headers (e.g., Renovate PRs)
- **Reusable workflows** in `.github/workflows/nx-release.yml`, `nx-release-pr.yml`, and `nx-release-auto-plan.yml` — full workflows downstream repos can call via `workflow_call`. Actions are referenced with pinned version tags (e.g., `rightcapitalhq/actions/nx-release-pr@nx-release-pr/v0.3.0`), kept in sync by `scripts/sync-workflow-action-refs.ts` which runs as a `post-version-command` hook during release PR creation
- **Self-hosting** — this repo dogfoods its own reusable workflow for release-pr (`release-pr.yml` calls `nx-release-pr.yml`), and uses the actions directly for release (`release.yml`)

## Key Conventions

- Actions live at the repo root (e.g., `nx-release/action.yml`), not nested under `.github/actions/`
- Actions are Node 24 JavaScript actions built with rslib (CJS format, `nx` externalized)
- Tag pattern: `{projectName}/v{version}` (e.g., `nx-release/v1.0.0`). Uses `/` instead of `@` because the [GitHub Actions runner splits on `@`](https://github.com/actions/runner/blob/9728019b24400dd2d99b1ad5e5622a218d588360/src/Runner.Worker/ActionManifestManagerWrapper.cs#L277-L278), making `@`-containing refs ambiguous
- Major version moving tags (e.g., `nx-release/v1`) are updated post-release by `scripts/update-major-tags.ts`
- Downstream repos reference reusable workflows as `rightcapitalhq/actions/.github/workflows/nx-release-pr.yml@nx-release-pr/v1`, or actions directly as `rightcapitalhq/actions/nx-release@nx-release/v1`
- `release-branch` input defaults to `release`, `base` input defaults to the repo's default branch (via `context.payload.repository?.default_branch`)
- `preVersionCommand: "pnpm run build"` in nx.json ensures dist/ is rebuilt during release PR creation
