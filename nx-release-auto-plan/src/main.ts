import * as core from '@actions/core';
import { $ } from 'execa';

const bumpTypeHeader = core.getInput('bump-header') || 'Nx-version-bump: ';
const baseRef = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : 'HEAD~1';

function gitHeadInfo(...args: string[]) {
  return $`git rev-list --max-count=1 --no-commit-header ${args} HEAD`;
}

async function configureGitUser() {
  const gitUser = await gitHeadInfo('--format=%an');
  const gitEmail = await gitHeadInfo('--format=%ae');

  await $`git config user.name ${gitUser}`;
  await $`git config user.email ${gitEmail}`;
}

async function parseBumpTypeAndMessage(): Promise<{
  bumpType: string;
  message: string;
} | null> {
  const rawMessage = (await gitHeadInfo('--format=%B')).stdout.split('\n');
  const bumpTypeLineIndex = rawMessage.findIndex((line) =>
    line.startsWith(bumpTypeHeader),
  );

  if (bumpTypeLineIndex === -1) {
    return null;
  }

  const bumpType = rawMessage[bumpTypeLineIndex].replace(bumpTypeHeader, '');
  const message = rawMessage.slice(0, bumpTypeLineIndex).join('\n').trim();

  return { bumpType, message };
}

async function generateVersionPlan({
  bumpType,
  message,
}: {
  bumpType: string;
  message: string;
}) {
  const result = await $({
    reject: false,
  })`pnpm exec nx release plan ${bumpType} --message ${message} --base ${baseRef}`;

  core.info(result.stdout);
  if (result.stderr) {
    core.warning(result.stderr);
  }

  if (result.exitCode !== 0) {
    throw new Error(
      `nx release plan failed with exit code ${String(result.exitCode)}`,
    );
  }
}

async function updateCommit({ message }: { message: string }) {
  await $`git add .`;
  await $`git commit --amend -m ${message}`;
  await $`git push --force-with-lease`;
}

async function main() {
  await configureGitUser();
  const bumpTypeAndMessage = await parseBumpTypeAndMessage();

  if (!bumpTypeAndMessage) {
    core.info('Bump type header already processed.');
    core.setOutput('amended', 'false');
    core.setOutput('bump-type', '');
    return;
  }

  const { bumpType, message } = bumpTypeAndMessage;
  core.setOutput('bump-type', bumpType);

  if (bumpType === 'none') {
    core.info('Bump type is "none", skipping version plan generation.');
    await updateCommit({ message });
    core.setOutput('amended', 'true');
    process.exitCode = 1;
    return;
  }

  await generateVersionPlan({ bumpType, message });
  await updateCommit({ message });
  core.setOutput('amended', 'true');
  // Exit 1 to signal CI re-run (commit was amended)
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
