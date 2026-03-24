# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

RightCapital's centralized repository for reusable GitHub Actions. Currently contains `nx-release` and `nx-release-pr` — a pair of actions for managing releases in Nx monorepos via version plans.

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
- **Two actions** in a fixed release group (always same version):
  - `nx-release/` — Creates git tags + GitHub releases (+ optional npm publish) after a release PR merge
  - `nx-release-pr/` — Creates/updates release PRs with version bumps from `.nx/version-plans/`
- **Reusable workflows** in `.github/workflows/nx-release.yml` and `nx-release-pr.yml` — full workflows downstream repos can call via `workflow_call`, using `./` local action refs (resolved from this repo at the called ref)
- **Self-hosting** — this repo dogfoods its own reusable workflow for release-pr (`release-pr.yml` calls `nx-release-pr.yml`), and uses the actions directly for release (`release.yml`)

## Key Conventions

- Actions live at the repo root (e.g., `nx-release/action.yml`), not nested under `.github/actions/`
- Actions are Node 24 JavaScript actions built with rslib (CJS format, `nx` externalized)
- Tag pattern: `{projectName}@v{version}` (e.g., `nx-release@v1.0.0`)
- Major version moving tags (e.g., `nx-release@v1`) are updated post-release by `scripts/update-major-tags.ts`
- Downstream repos reference reusable workflows as `rightcapitalhq/actions/.github/workflows/nx-release-pr.yml@nx-release-pr@v1`, or actions directly as `rightcapitalhq/actions/nx-release@nx-release@v1`
- `release-branch` input defaults to `release`, `base` input defaults to the repo's default branch (via `context.payload.repository?.default_branch`)
- `preVersionCommand: "pnpm run build"` in nx.json ensures dist/ is rebuilt during release PR creation
