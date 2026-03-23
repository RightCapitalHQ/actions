/**
 * Post-release script: update major version tags.
 *
 * After nx-release creates precise version tags like `nx-release@v1.2.3`,
 * this script creates or updates the corresponding major version tags
 * (e.g., `nx-release@v1`) so downstream consumers can pin to a major version.
 *
 * Usage:
 *   tsx scripts/update-major-tags.ts '["nx-release@v1.2.3","nx-release-pr@v1.2.3"]'
 */

import { $ } from 'execa';

const newTags: string[] = JSON.parse(process.argv[2] || '[]');

for (const tag of newTags) {
  // Match tags like `nx-release@v1.2.3` → major tag `nx-release@v1`
  const match = tag.match(/^(.+@v)(\d+)\.\d+\.\d+$/);
  if (match?.[1] != null && match[2] != null) {
    const majorTag = `${match[1]}${match[2]}`;

    // eslint-disable-next-line no-await-in-loop
    await $`git tag -f ${majorTag} ${tag}`;
    // eslint-disable-next-line no-await-in-loop
    await $`git push origin ${majorTag} --force`;

    console.log(`Updated major version tag: ${majorTag} → ${tag}`);
  }
}
