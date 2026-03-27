import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readNxJson } from 'nx/src/config/nx-json.js';
import { createProjectGraphAsync } from 'nx/src/project-graph/project-graph.js';
import { findMatchingProjects } from 'nx/src/utils/find-matching-projects.js';

export interface IPackageInfo {
  projectName: string;
  npmName: string;
  version: string;
  root: string;
  expectedTag: string;
}

export async function discoverPackages(): Promise<IPackageInfo[]> {
  const nxJson = readNxJson();
  const projectGraph = await createProjectGraphAsync();

  const tagPattern =
    nxJson?.release?.releaseTag?.pattern ?? '{projectName}/v{version}';
  const groups = nxJson?.release?.groups;
  const releaseProjects = nxJson?.release?.projects;

  let projectNames: string[];

  if (groups) {
    // Collect all project names from explicit release groups
    projectNames = Array.from(
      new Set(
        Object.values(groups).flatMap((group) => group.projects as string[]),
      ),
    );
  } else if (releaseProjects) {
    // Fall back to top-level release.projects (Nx creates an implicit default group)
    const patterns = Array.isArray(releaseProjects)
      ? releaseProjects
      : [releaseProjects];
    projectNames = findMatchingProjects(patterns, projectGraph.nodes);
  } else {
    throw new Error('No release groups or projects found in nx.json');
  }

  const packages = await Promise.all(
    projectNames.map(async (projectName) => {
      const node = projectGraph.nodes[projectName];
      if (!node) {
        throw new Error(`Project "${projectName}" not found in project graph`);
      }

      const { root } = node.data;
      const npmName: string =
        node.data.metadata?.js?.packageName ?? projectName;

      const packageJsonPath = join(root, 'package.json');
      const packageJson = JSON.parse(
        await readFile(packageJsonPath, 'utf8'),
      ) as { version: string };

      const expectedTag = tagPattern
        .replace('{projectName}', npmName)
        .replace('{version}', packageJson.version);

      return {
        projectName,
        npmName,
        version: packageJson.version,
        root,
        expectedTag,
      };
    }),
  );

  return packages;
}
