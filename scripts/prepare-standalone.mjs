import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = join(projectRoot, ".next", "standalone");

if (!existsSync(standaloneRoot)) {
  throw new Error(
    "Standalone output is missing. Ensure next.config.ts uses output: 'standalone'.",
  );
}

const assetDirectories = [
  {
    source: join(projectRoot, "public"),
    destination: join(standaloneRoot, "public"),
  },
  {
    source: join(projectRoot, ".next", "static"),
    destination: join(standaloneRoot, ".next", "static"),
  },
];

for (const { source, destination } of assetDirectories) {
  if (!existsSync(source)) {
    continue;
  }

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}
