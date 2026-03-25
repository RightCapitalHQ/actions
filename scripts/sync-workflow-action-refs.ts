/**
 * Post-version script: sync workflow action references.
 *
 * Updates `uses:` references in reusable workflow files to match
 * the version being released. Reads version data from the
 * NX_RELEASE_PR_BUMPED_PACKAGES env var set by the nx-release-pr action.
 *
 * Usage (via post-version-command):
 *   node scripts/sync-workflow-action-refs.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packages = JSON.parse(
  process.env.NX_RELEASE_PR_BUMPED_PACKAGES ?? '[]',
) as { name: string; version: string }[];

const dir = '.github/workflows';

for (const file of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
  const fp = join(dir, file);
  let content = readFileSync(fp, 'utf8');
  let changed = false;

  for (const { name, version } of packages) {
    const re = new RegExp(
      `(rightcapitalhq/actions/${name}@${name}/v)\\d+\\.\\d+\\.\\d+`,
      'g',
    );
    const updated = content.replace(re, `$1${version}`);
    if (updated !== content) {
      content = updated;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(fp, content);
    console.log(`Updated action refs in ${file} to match new versions`);
  }
}
