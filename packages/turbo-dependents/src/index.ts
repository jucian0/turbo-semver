import { getPackagesSync, Package as PKG } from "@manypkg/get-packages";
import { getFoldersWithCommits } from "@turbo-version/git";
import { Config } from "@turbo-version/setup";
import { cwd } from "process";

type Package = PKG & { type?: string };

function getDependents(
  packages: Package[],
  pkgName: string,
  type: any
): Package[] {
  try {
    return packages.reduce((acc, ac) => {
      const allDependencies = Object.keys({
        ...ac.packageJson.dependencies,
        ...ac.packageJson.devDependencies,
      });

      const dependency = allDependencies.find((dep) => dep === pkgName);
      if (dependency) {
        acc.push({ ...ac, type });
      }
      return acc;
    }, [] as any[]);
  } catch (err) {
    return [];
  }
}

function filterPackages(packages: Package[], folders: string[]) {
  return packages.filter((pkg) => {
    return folders.find((path) => path.includes(pkg.relativeDir));
  });
}

export async function summarizePackages(config: Config): Promise<Package[]> {
  try {
    const folders = await getFoldersWithCommits();
    const monoRepo = getPackagesSync(cwd());
    const filteredPackages = filterPackages(monoRepo.packages, folders);

    if (config.updateInternalDependencies) {
      return filteredPackages.reduce((packages, pkg) => {
        const dependents = getDependents(
          monoRepo.packages,
          pkg.packageJson.name,
          config.updateInternalDependencies
        );

        const filteredDependents = dependents.filter((d) =>
          packages.every((p) => p.relativeDir !== d.relativeDir)
        );

        return [...packages, ...filteredDependents];
      }, filteredPackages);
    }

    return filteredPackages;
  } catch (err) {
    return err as any;
  }
}
