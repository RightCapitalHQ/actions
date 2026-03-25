# actions

RightCapital's centralized reusable GitHub Actions.

## Available Actions

### nx-release

Create git tags and GitHub releases for an Nx-managed monorepo. Designed to run after a Release PR is merged to `main`.

**What it does:**

1. Discovers all packages from the Nx release groups in `nx.json`
2. Creates git tags for packages whose expected tag does not yet exist, and pushes them
3. Creates GitHub releases with changelog notes extracted from each package's `CHANGELOG.md`
4. Optionally publishes packages to npm via `nx release publish`

#### Inputs

| Input            | Required | Default | Description                                 |
| ---------------- | -------- | ------- | ------------------------------------------- |
| `token`          | Yes      |         | GitHub token used to create GitHub releases |
| `create-release` | No       | `true`  | Whether to create GitHub releases           |
| `dry-run`        | No       | `false` | Run without making any changes              |
| `publish`        | No       | `false` | Whether to publish packages to npm          |

#### Outputs

| Output               | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `new-tags`           | JSON array of newly created git tags                                                |
| `published`          | Whether packages were published to npm (`true`/`false`)                             |
| `published-packages` | JSON array of published packages (e.g. `[{"name":"@scope/pkg","version":"1.0.0"}]`) |

### nx-release-pr

Create or update a release PR for an Nx-managed monorepo. Designed to run on push to `main` (when version plans exist).

**What it does:**

1. Creates a release branch from `main`
2. Reads version plan files from `.nx/version-plans/`
3. Runs `releaseVersion()` and `releaseChangelog()` from the Nx programmatic API to bump versions and generate changelogs
4. Updates the pnpm lockfile
5. Commits, pushes to the release branch
6. Creates a new PR (or updates an existing one) with a version table and grouped changes

#### Inputs

| Input            | Required | Default                           | Description                                           |
| ---------------- | -------- | --------------------------------- | ----------------------------------------------------- |
| `release-branch` | No       | `release`                         | Branch name for the release PR                        |
| `base`           | No       | repo's default branch             | Base branch for the PR (falls back to default branch) |
| `pr-title`       | Yes      |                                   | Pull request title                                    |
| `banner`         | No       | `''`                              | Markdown banner prepended to the PR body              |
| `commit-message` | No       | `chore(release): prepare release` | Git commit message for the version bump               |
| `label`          | No       | `release`                         | Label to apply to the PR                              |
| `token`          | Yes      |                                   | GitHub token for git push and PR operations           |
| `git-user-name`  | No       | `GitHub Actions[bot]`             | Git user.name for the version bump commit             |
| `git-user-email` | No       | `npm-publisher@rightcapital.com`  | Git user.email for the version bump commit            |

#### Outputs

| Output      | Description                         |
| ----------- | ----------------------------------- |
| `pr-url`    | URL of the created or updated PR    |
| `pr-number` | Number of the created or updated PR |

### nx-release-auto-plan

Auto-generate Nx version plans from commit bump headers. Designed to run on Renovate PRs (or any PR whose commits contain a bump type header).

**What it does:**

1. Parses the HEAD commit message for an `Nx-version-bump: <type>` header (e.g., `Nx-version-bump: patch`)
2. Runs `nx release plan <type>` to generate a version plan file
3. Amends the commit with the version plan added and the bump header stripped
4. Force-pushes the amended commit (triggers CI re-run)

#### Inputs

| Input         | Required | Default             | Description                                     |
| ------------- | -------- | ------------------- | ----------------------------------------------- |
| `bump-header` | No       | `Nx-version-bump: ` | Commit message header prefix for bump detection |

#### Outputs

| Output      | Description                                                                              |
| ----------- | ---------------------------------------------------------------------------------------- |
| `amended`   | Whether the commit was amended (`true` if version plan was generated or header stripped) |
| `bump-type` | The detected bump type (`patch`, `minor`, `major`, `none`, or empty if no header)        |

## Release Flow

```
Developer creates version plan    ──►  Feature PR merged to main
                                            │
                                            ▼
                                    release-pr workflow
                                    (nx-release-pr action)
                                            │
                                            ▼
                                    Release PR created/updated
                                    (release → main)
                                            │
                                            ▼
                                    Maintainer merges PR
                                            │
                                            ▼
                                    release workflow
                                    (nx-release action)
                                            │
                                            ▼
                              Git tags + GitHub releases created
                              (+ optional npm publish)
```

1. **Create a version plan**: On a feature branch, run `pnpm -w change` (or `nx release plan`) to create a version plan file in `.nx/version-plans/`. The file specifies which packages to bump and by how much. Commit it alongside your changes.
2. **Merge feature PR**: When version plans land on `main` (via merged feature PRs), the Release PR workflow runs `nx-release-pr` to create or update a Release PR on the `release` branch.
3. **Review and merge**: The Release PR shows a version table and grouped changes. Merge it to `main` when ready.
4. **Release**: When the Release PR is merged, the Release workflow runs `nx-release` to create git tags, GitHub releases, and optionally publish to npm.

### Version Plan Format

Version plans are markdown files in `.nx/version-plans/` with YAML front matter:

```markdown
---
nx-release: minor
---

Add support for custom changelog renderers
```

Bump values: `major`, `minor`, `patch`. For fixed release groups, use the group name instead of individual project names.

## Usage

### Option A: Reusable Workflows (Recommended)

The simplest way to adopt the nx release flow. Add two workflow files to your repo:

**`.github/workflows/release-pr.yml`**:

```yaml
name: Release PR

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  release-pr:
    uses: rightcapitalhq/actions/.github/workflows/nx-release-pr.yml@nx-release-pr/v1
    secrets: inherit
```

**`.github/workflows/release.yml`**:

```yaml
name: Release

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  release:
    if: >-
      github.event.pull_request.merged == true
      && github.event.pull_request.head.ref == 'release'
    uses: rightcapitalhq/actions/.github/workflows/nx-release.yml@nx-release/v1
    secrets: inherit
```

To also publish packages to npm, pass `publish: true`:

```yaml
uses: rightcapitalhq/actions/.github/workflows/nx-release.yml@nx-release/v1
with:
  publish: true
secrets: inherit
```

**`.github/workflows/renovate-auto-plan.yml`** (optional, for auto-generating version plans on Renovate PRs):

```yaml
name: Renovate Auto Plan

on:
  pull_request:
    branches: [main]

jobs:
  auto-plan:
    if: startsWith(github.event.pull_request.head.ref, 'renovate/')
    uses: rightcapitalhq/actions/.github/workflows/nx-release-auto-plan.yml@nx-release/v1
    secrets: inherit
```

The reusable workflows handle checkout, pnpm/node setup, dependency installation, and action invocation. They use `secrets.RC_BOT_APP_ID` and `secrets.RC_BOT_PRIVATE_KEY` (org-level secrets) to generate a GitHub App installation token via [`actions/create-github-app-token`](https://github.com/actions/create-github-app-token). The git committer identity is automatically derived from the app.

### Option B: Direct Action References

For more control, reference the actions directly in your workflows. Generate a GitHub App token first, then pass it to the actions:

```yaml
# Generate a token (add this step before using the actions):
- name: Generate GitHub App token
  id: app-token
  uses: actions/create-github-app-token@v2
  with:
    app-id: ${{ secrets.RC_BOT_APP_ID }}
    private-key: ${{ secrets.RC_BOT_PRIVATE_KEY }}

# In your release-pr workflow:
- uses: rightcapitalhq/actions/nx-release-pr@nx-release-pr/v1
  with:
    pr-title: 'chore(release): release packages'
    token: ${{ steps.app-token.outputs.token }}
    git-user-name: '${{ steps.app-token.outputs.app-slug }}[bot]'

# In your release workflow:
- uses: rightcapitalhq/actions/nx-release@nx-release/v1
  with:
    token: ${{ steps.app-token.outputs.token }}
```

### Prerequisites

Your repo must have:

1. **`nx` as a project dependency**, with release groups configured in `nx.json`:

   ```json
   {
     "release": {
       "groups": {
         "my-group": {
           "projects": ["package-a", "package-b"],
           "projectsRelationship": "fixed"
         }
       },
       "versionPlans": true,
       "changelog": {
         "projectChangelogs": true,
         "workspaceChangelog": false
       },
       "releaseTag": {
         "pattern": "{projectName}/v{version}"
       }
     }
   }
   ```

2. **pnpm** as the package manager (with `pnpm-workspace.yaml`)

3. **GitHub App** — the reusable workflows authenticate using a GitHub App via org-level secrets `RC_BOT_APP_ID` and `RC_BOT_PRIVATE_KEY`. The app needs **Contents** (Read & Write) and **Pull Requests** (Read & Write) permissions. Callers pass these secrets via `secrets: inherit`. The `id-token: write` workflow permission (set automatically by the reusable workflows) enables npm trusted publishing (OIDC provenance) when `publish: true` is used — no npm token secret is needed

## Development

### Build

```bash
pnpm install
pnpm run build
```

Both actions are built with [rslib](https://lib.rsbuild.dev/) into a single CJS bundle at `dist/index.js`. CJS is used instead of ESM because `signal-exit` (a transitive dependency) causes TDZ errors under ESM scope hoisting. All dependencies are bundled except `nx`, which is externalized.

### Creating a Version Plan

```bash
pnpm -w change
```

This creates a version plan file in `.nx/version-plans/`. Commit it with your changes.

### Tag Strategy

- **Precise version tags**: `nx-release/v1.0.0` (created by the nx-release action)
- **Major version tags**: `nx-release/v1` (updated by `scripts/update-major-tags.ts` post-release)
- Both `nx-release` and `nx-release-pr` are in a fixed release group — they always share the same version
- Tags use `/` instead of `@` as separator because the GitHub Actions runner [splits `uses:` on `@`](https://github.com/actions/runner/blob/9728019b24400dd2d99b1ad5e5622a218d588360/src/Runner.Worker/ActionManifestManagerWrapper.cs#L277-L278), making `@`-containing refs ambiguous. [Renovate also supports `/`-separated tags](https://github.com/renovatebot/renovate/pull/35431)
