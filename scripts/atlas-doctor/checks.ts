import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import { Client } from "pg";

import {
  databaseTargetsDiffer,
  inspectDatabaseUrl,
  redactSecrets,
} from "./database-url";
import { createReport } from "./report";
import type {
  DoctorCheck,
  DoctorOptions,
  DoctorReport,
  DoctorSection,
  DoctorStatus,
} from "./types";
import type { DatabaseUrlInspection } from "../../src/server/config/databaseConfig";

type CommandResult = {
  readonly exitCode: number | null;
  readonly failure: string | null;
  readonly output: string;
};

type ConnectionChecks = {
  readonly connectivity: DoctorSection;
  readonly database: DoctorSection;
};

function check(
  id: string,
  label: string,
  status: DoctorStatus,
  message: string,
  details?: DoctorCheck["details"],
): DoctorCheck {
  return details
    ? { details, id, label, message, status }
    : { id, label, message, status };
}

function hasEnvironmentValue(
  env: NodeJS.ProcessEnv,
  name: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(env, name);
}

function environmentValueCheck(
  env: NodeJS.ProcessEnv,
  name: "DATABASE_URL" | "DIRECT_URL" | "HOSTNAME" | "NODE_ENV" | "PORT",
): DoctorCheck {
  const present = hasEnvironmentValue(env, name);
  const value = env[name];

  if (!present || value === undefined) {
    return check(
      `environment.${name.toLowerCase()}`,
      name,
      name === "DATABASE_URL" ? "error" : "warning",
      "Missing.",
    );
  }

  if (value.trim() === "") {
    const preventsMigration = name === "DATABASE_URL" || name === "DIRECT_URL";

    return check(
      `environment.${name.toLowerCase()}`,
      name,
      preventsMigration ? "error" : "warning",
      preventsMigration
        ? "Empty; Atlas database commands cannot resolve a usable URL."
        : "Empty.",
    );
  }

  if (name === "DATABASE_URL" || name === "DIRECT_URL") {
    const inspection = inspectDatabaseUrl(value);
    const status: DoctorStatus = inspection.issues.some(
      (issue) => issue.status === "error",
    )
      ? "error"
      : inspection.issues.length > 0
        ? "warning"
        : "ok";

    return check(
      `environment.${name.toLowerCase()}`,
      name,
      status,
      status === "ok" ? "Present." : "Present, but looks suspicious.",
      { value: inspection.redacted },
    );
  }

  if (name === "NODE_ENV" && !["development", "production", "test"].includes(value)) {
    return check(
      "environment.node_env",
      name,
      "warning",
      `Present, but \"${value}\" is not a conventional Node environment.`,
    );
  }

  if (name === "PORT") {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      return check(
        "environment.port",
        name,
        "warning",
        `Present, but \"${value}\" is not a valid TCP port.`,
      );
    }
  }

  return check(
    `environment.${name.toLowerCase()}`,
    name,
    "ok",
    "Present.",
    { value },
  );
}

function environmentSection(env: NodeJS.ProcessEnv): DoctorSection {
  return {
    checks: [
      environmentValueCheck(env, "DATABASE_URL"),
      environmentValueCheck(env, "DIRECT_URL"),
      environmentValueCheck(env, "NODE_ENV"),
      environmentValueCheck(env, "PORT"),
      environmentValueCheck(env, "HOSTNAME"),
    ],
    id: "environment",
    title: "Environment",
  };
}

function issueStatus(
  inspection: DatabaseUrlInspection,
  codes: readonly DatabaseUrlInspection["issues"][number]["code"][],
): DoctorStatus {
  const issues = inspection.issues.filter((issue) => codes.includes(issue.code));
  if (issues.some((issue) => issue.status === "error")) return "error";
  if (issues.length > 0) return "warning";
  return "ok";
}

function issueMessage(
  inspection: DatabaseUrlInspection,
  codes: readonly DatabaseUrlInspection["issues"][number]["code"][],
): string | null {
  return (
    inspection.issues.find((issue) => codes.includes(issue.code))?.message ?? null
  );
}

function databaseUrlSection(
  value: string | undefined,
  inspection: DatabaseUrlInspection | null,
): DoctorSection {
  if (!value || !inspection) {
    return {
      checks: [
        check(
          "database-url.parse",
          "DATABASE_URL",
          "error",
          value === "" ? "Cannot parse an empty value." : "Cannot parse a missing value.",
        ),
      ],
      id: "database-url",
      title: "Database URL",
    };
  }

  if (inspection.provider === null) {
    return {
      checks: [
        check(
          "database-url.parse",
          "DATABASE_URL",
          "error",
          inspection.issues[0]?.message ?? "Cannot parse the database URL.",
        ),
      ],
      id: "database-url",
      title: "Database URL",
    };
  }

  const hostStatus = issueStatus(inspection, ["host_invalid", "host_local"]);
  const databaseStatus = issueStatus(inspection, ["database_missing"]);
  const providerStatus = issueStatus(inspection, ["provider_invalid"]);
  const sslStatus = issueStatus(inspection, ["ssl_disabled"]);

  return {
    checks: [
      check(
        "database-url.provider",
        "Provider",
        providerStatus,
        issueMessage(inspection, ["provider_invalid"]) ?? inspection.provider,
      ),
      check(
        "database-url.host",
        "Host",
        hostStatus,
        issueMessage(inspection, ["host_invalid", "host_local"]) ??
          (inspection.host as string),
      ),
      check(
        "database-url.port",
        "Port",
        "ok",
        String(inspection.port),
      ),
      check(
        "database-url.database",
        "Database",
        databaseStatus,
        issueMessage(inspection, ["database_missing"]) ??
          (inspection.database as string),
      ),
      check(
        "database-url.schema",
        "Schema",
        "ok",
        inspection.schema ?? "public",
      ),
      check(
        "database-url.ssl",
        "SSL",
        sslStatus,
        issueMessage(inspection, ["ssl_disabled"]) ?? inspection.ssl,
      ),
    ],
    id: "database-url",
    title: "Database URL",
  };
}

function directUrlSection(
  databaseUrl: string | undefined,
  databaseInspection: DatabaseUrlInspection | null,
  directUrl: string | undefined,
  directInspection: DatabaseUrlInspection | null,
): DoctorSection {
  if (directUrl === undefined) {
    return {
      checks: [
        check(
          "direct-url.presence",
          "DIRECT_URL",
          "warning",
          "Missing; Prisma CLI will use DATABASE_URL.",
        ),
        check(
          "direct-url.precedence",
          "Prisma precedence",
          "ok",
          "DATABASE_URL is selected because DIRECT_URL is not present.",
        ),
      ],
      id: "direct-url",
      title: "DIRECT_URL",
    };
  }

  if (directUrl.trim() === "" || !directInspection) {
    return {
      checks: [
        check(
          "direct-url.presence",
          "DIRECT_URL",
          "error",
          "Empty; it shadows DATABASE_URL and leaves Prisma without a datasource URL.",
        ),
      ],
      id: "direct-url",
      title: "DIRECT_URL",
    };
  }

  const invalid = directInspection.issues.some(
    (issue) => issue.status === "error",
  );
  const local = directInspection.issues.find(
    (issue) => issue.code === "host_local",
  );
  const comparable =
    Boolean(databaseUrl) &&
    databaseInspection?.valid === true &&
    directInspection.valid;
  const different = comparable
    ? databaseTargetsDiffer(databaseInspection, directInspection)
    : false;

  return {
    checks: [
      check(
        "direct-url.presence",
        "DIRECT_URL",
        invalid ? "error" : local ? "warning" : "ok",
        invalid
          ? directInspection.issues.find((issue) => issue.status === "error")
              ?.message ?? "Invalid."
          : local?.message ?? "Present.",
        { value: directInspection.redacted },
      ),
      check(
        "direct-url.precedence",
        "Prisma precedence",
        "ok",
        "DIRECT_URL overrides DATABASE_URL for Prisma CLI commands only.",
      ),
      check(
        "direct-url.target",
        "Connection target",
        !comparable ? "warning" : different ? "warning" : "ok",
        !comparable
          ? "Cannot compare targets until both URLs are valid."
          : different
            ? "DIRECT_URL points to a different host, port, database, or schema than DATABASE_URL."
            : "DIRECT_URL and DATABASE_URL resolve to the same database target.",
      ),
    ],
    id: "direct-url",
    title: "DIRECT_URL",
  };
}

function commandFailure(output: string, fallback: string): string {
  const meaningful = redactSecrets(output)
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");

  return (meaningful || fallback).slice(0, 600);
}

function runPrismaCommand(
  cwd: string,
  env: NodeJS.ProcessEnv,
  args: readonly string[],
  timeout: number,
): CommandResult {
  const executable = path.join(
    cwd,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma",
  );

  if (!existsSync(executable)) {
    return {
      exitCode: null,
      failure: "Prisma CLI is not installed in node_modules.",
      output: "",
    };
  }

  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    env,
    timeout,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  return {
    exitCode: result.status,
    failure: result.error
      ? commandFailure(result.error.message, "Prisma command failed to start.")
      : null,
    output,
  };
}

function prismaSection(options: DoctorOptions): DoctorSection {
  const schemaPath = path.join(options.cwd, "prisma/schema.prisma");
  const configPath = path.join(options.cwd, "prisma.config.ts");
  const clientPath = path.join(options.cwd, "src/generated/prisma/client.ts");
  const migrationsPath = path.join(options.cwd, "prisma/migrations");
  const timeout = options.commandTimeoutMs ?? 15_000;
  const checks: DoctorCheck[] = [
    check(
      "prisma.schema",
      "Schema",
      existsSync(schemaPath) ? "ok" : "error",
      existsSync(schemaPath) ? "prisma/schema.prisma exists." : "Schema is missing.",
    ),
    check(
      "prisma.config",
      "Prisma config",
      existsSync(configPath) ? "ok" : "error",
      existsSync(configPath)
        ? "prisma.config.ts exists."
        : "prisma.config.ts is missing.",
    ),
    check(
      "prisma.client",
      "Prisma Client",
      existsSync(clientPath) ? "ok" : "error",
      existsSync(clientPath)
        ? "Generated client is present."
        : "Generated client is missing; run npm run db:generate.",
    ),
  ];

  const migrationDirectories = existsSync(migrationsPath)
    ? readdirSync(migrationsPath, { withFileTypes: true }).filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(path.join(migrationsPath, entry.name, "migration.sql")),
      )
    : [];
  checks.push(
    check(
      "prisma.migrations",
      "Migration directory",
      migrationDirectories.length > 0 ? "ok" : "error",
      migrationDirectories.length > 0
        ? `${migrationDirectories.length} migration directories found.`
        : "No migration directories containing migration.sql were found.",
      { count: migrationDirectories.length },
    ),
  );

  if (existsSync(schemaPath) && existsSync(configPath)) {
    const validation = runPrismaCommand(
      options.cwd,
      options.env,
      ["validate"],
      timeout,
    );
    checks.push(
      check(
        "prisma.validation",
        "Schema validation",
        validation.exitCode === 0 ? "ok" : "error",
        validation.exitCode === 0
          ? "Schema is valid."
          : validation.failure ??
              commandFailure(validation.output, "Prisma schema validation failed."),
      ),
    );
  }

  const effectiveUrl = options.env.DIRECT_URL ?? options.env.DATABASE_URL;
  if (!effectiveUrl) {
    checks.push(
      check(
        "prisma.migration-status",
        "Migration status",
        "warning",
        "Skipped because Prisma has no effective database URL.",
      ),
    );
  } else {
    const status = runPrismaCommand(
      options.cwd,
      options.env,
      ["migrate", "status"],
      timeout,
    );
    const pending = /not yet been applied|following migration|pending migration/i.test(
      status.output,
    );
    checks.push(
      check(
        "prisma.migration-status",
        "Migration status",
        status.exitCode === 0 ? "ok" : pending ? "warning" : "error",
        status.exitCode === 0
          ? "Migrations are current."
          : pending
            ? "Pending migrations detected."
            : status.failure ??
              commandFailure(status.output, "Unable to read migration status."),
      ),
    );
  }

  return { checks, id: "prisma", title: "Prisma" };
}

function fileContains(file: string, pattern: RegExp): boolean {
  return existsSync(file) && pattern.test(readFileSync(file, "utf8"));
}

function repositorySection(cwd: string): DoctorSection {
  const applicationContainer = path.join(
    cwd,
    "src/application/ApplicationContainer.ts",
  );
  const repositoryFactory = path.join(cwd, "src/repositories/RepositoryFactory.ts");
  const prismaFactory = path.join(
    cwd,
    "src/repositories/PrismaRepositoryFactory.ts",
  );
  const compositionRoot = path.join(cwd, "src/application/container.ts");
  const prismaClient = path.join(cwd, "src/lib/prisma.ts");

  return {
    checks: [
      check(
        "repository.application-container",
        "ApplicationContainer",
        fileContains(applicationContainer, /class\s+ApplicationContainer\b/)
          ? "ok"
          : "error",
        fileContains(applicationContainer, /class\s+ApplicationContainer\b/)
          ? "Application composition boundary exists."
          : "ApplicationContainer is missing or malformed.",
      ),
      check(
        "repository.factory-contract",
        "RepositoryFactory",
        fileContains(repositoryFactory, /interface\s+RepositoryFactory\b/)
          ? "ok"
          : "error",
        fileContains(repositoryFactory, /interface\s+RepositoryFactory\b/)
          ? "Repository abstraction exists."
          : "RepositoryFactory contract is missing or malformed.",
      ),
      check(
        "repository.prisma-factory",
        "PrismaRepositoryFactory",
        fileContains(
          prismaFactory,
          /class\s+PrismaRepositoryFactory\s+implements\s+RepositoryFactory/,
        )
          ? "ok"
          : "error",
        fileContains(
          prismaFactory,
          /class\s+PrismaRepositoryFactory\s+implements\s+RepositoryFactory/,
        )
          ? "PostgreSQL adapters are selected behind RepositoryFactory."
          : "PrismaRepositoryFactory is missing or does not implement the contract.",
      ),
      check(
        "repository.server-boundaries",
        "Server boundaries",
        [compositionRoot, prismaFactory, prismaClient].every((file) =>
          fileContains(file, /import\s+["']server-only["']/),
        )
          ? "ok"
          : "error",
        [compositionRoot, prismaFactory, prismaClient].every((file) =>
          fileContains(file, /import\s+["']server-only["']/),
        )
          ? "Composition root, Prisma factory, and Prisma client are server-only."
          : "One or more persistence boundary modules lack a server-only guard.",
      ),
      check(
        "repository.summary",
        "Architecture summary",
        "ok",
        "ApplicationContainer → RepositoryFactory → PrismaRepositoryFactory → Prisma Client.",
      ),
    ],
    id: "repository",
    title: "Repository",
  };
}

function sourceFiles(directory: string): readonly string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

function relativePaths(cwd: string, files: readonly string[]): string {
  return files.map((file) => path.relative(cwd, file)).join(", ");
}

function architectureSection(cwd: string): DoctorSection {
  const files = sourceFiles(path.join(cwd, "src"));
  const clientFiles = files.filter((file) =>
    readFileSync(file, "utf8").slice(0, 500).match(/["']use client["'];/),
  );
  const directPersistenceImports = clientFiles.filter((file) => {
    const source = readFileSync(file, "utf8");
    return /(?:from\s+|import\s*\(\s*|import\s+)["'](?:@\/(?:generated\/prisma|lib\/prisma|repositories)(?:\/|["'])|@prisma\/|prisma\/)/.test(
      source,
    );
  });
  const repositoryInstantiations = files.filter((file) => {
    const source = readFileSync(file, "utf8");
    return /new\s+Prisma(?:Area|DailyReview|DayPlan|Item)Repository\s*\(/.test(
      source,
    );
  });
  const expectedFactory = "src/repositories/PrismaRepositoryFactory.ts";
  const unexpectedInstantiations = repositoryInstantiations.filter(
    (file) => path.relative(cwd, file) !== expectedFactory,
  );
  const route = path.join(cwd, "src/app/api/atlas/route.ts");
  const routeSource = existsSync(route) ? readFileSync(route, "utf8") : "";
  const routeViolation =
    !routeSource.includes('from "@/application/container"') ||
    /from\s+["']@\/(?:repositories|lib\/prisma|generated\/prisma)/.test(
      routeSource,
    );
  const root = path.join(cwd, "src/application/container.ts");
  const rootSource = existsSync(root) ? readFileSync(root, "utf8") : "";
  const rootSelectsPrisma = /new\s+PrismaRepositoryFactory\s*\(\s*\)/.test(
    rootSource,
  );

  const checks: DoctorCheck[] = [
    check(
      "architecture.client-boundary",
      "Client Component boundary",
      directPersistenceImports.length === 0 ? "ok" : "error",
      directPersistenceImports.length === 0
        ? `${clientFiles.length} Client Components import neither Prisma nor repositories.`
        : `Direct persistence imports found in: ${relativePaths(cwd, directPersistenceImports)}.`,
      { checkedClientComponents: clientFiles.length },
    ),
    check(
      "architecture.repository-construction",
      "Repository construction",
      unexpectedInstantiations.length === 0 && repositoryInstantiations.length === 1
        ? "ok"
        : "error",
      unexpectedInstantiations.length === 0 && repositoryInstantiations.length === 1
        ? "Concrete Prisma repositories are instantiated only by their server factory."
        : `Unexpected repository construction: ${relativePaths(cwd, unexpectedInstantiations)}.`,
    ),
    check(
      "architecture.api-boundary",
      "HTTP feature boundary",
      routeViolation ? "error" : "ok",
      routeViolation
        ? "The Atlas API route bypasses or cannot find the application container boundary."
        : "The Atlas API route delegates through the application container.",
    ),
    check(
      "architecture.composition-root",
      "Production composition root",
      rootSelectsPrisma ? "ok" : "error",
      rootSelectsPrisma
        ? "The server composition root selects PrismaRepositoryFactory."
        : "The production persistence factory could not be verified.",
    ),
  ];
  const hasViolation = checks.some((item) => item.status === "error");
  checks.push(
    check(
      "architecture.graph",
      "Dependency graph",
      hasViolation ? "error" : "ok",
      "UI → Application Services → Repositories → Prisma → PostgreSQL",
    ),
  );

  return { checks, id: "architecture", title: "Architecture" };
}

function deploymentSection(cwd: string): DoctorSection {
  const railwayPath = path.join(cwd, "railway.json");
  const packagePath = path.join(cwd, "package.json");
  const checks: DoctorCheck[] = [];
  let railway: unknown;
  let packageJson: unknown;

  try {
    railway = JSON.parse(readFileSync(railwayPath, "utf8"));
    checks.push(
      check("deployment.railway", "railway.json", "ok", "Valid JSON found."),
    );
  } catch (error) {
    checks.push(
      check(
        "deployment.railway",
        "railway.json",
        "error",
        existsSync(railwayPath)
          ? `Invalid JSON: ${safeErrorMessage(error)}`
          : "File is missing.",
      ),
    );
  }

  try {
    packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    checks.push(
      check("deployment.package", "package.json", "ok", "Valid JSON found."),
    );
  } catch (error) {
    checks.push(
      check(
        "deployment.package",
        "package.json",
        "error",
        existsSync(packagePath)
          ? `Invalid JSON: ${safeErrorMessage(error)}`
          : "File is missing.",
      ),
    );
  }

  const railwayRecord = railway as
    | { deploy?: { startCommand?: unknown }; build?: { buildCommand?: unknown } }
    | undefined;
  const scripts = (
    packageJson as { scripts?: Readonly<Record<string, unknown>> } | undefined
  )?.scripts;
  const startCommand = railwayRecord?.deploy?.startCommand;
  const buildCommand = railwayRecord?.build?.buildCommand;
  const startMigrate = scripts?.["start:migrate"];
  const migrateDeploy = scripts?.["db:migrate:deploy"];
  const build = scripts?.build;
  const startupSequenceIsSafe =
    typeof startMigrate === "string" &&
    startMigrate.indexOf("config:check:startup") >= 0 &&
    startMigrate.indexOf("config:check:startup") <
      startMigrate.indexOf("db:migrate:deploy") &&
    startMigrate.indexOf("db:migrate:deploy") < startMigrate.indexOf("npm start");

  checks.push(
    check(
      "deployment.start-command",
      "Railway start command",
      startCommand === "npm run start:migrate" ? "ok" : "warning",
      startCommand === "npm run start:migrate"
        ? "Runs start:migrate before the application server."
        : "Expected railway.json to run npm run start:migrate.",
    ),
    check(
      "deployment.start-migrate",
      "start:migrate script",
      startupSequenceIsSafe ? "ok" : "warning",
      startupSequenceIsSafe
        ? "Validates configuration, deploys migrations, then starts Atlas."
        : "Expected configuration validation before migrations and application startup.",
    ),
    check(
      "deployment.migrate-script",
      "db:migrate:deploy script",
      migrateDeploy === "prisma migrate deploy" ? "ok" : "warning",
      migrateDeploy === "prisma migrate deploy"
        ? "Uses Prisma's production migration command."
        : "Expected prisma migrate deploy.",
    ),
    check(
      "deployment.build-script",
      "Build script",
      buildCommand === "npm run build" &&
        typeof build === "string" &&
        build.includes("prisma generate") &&
        build.includes("tsc -p tsconfig.doctor.json") &&
        build.includes("next build")
        ? "ok"
        : "warning",
      buildCommand === "npm run build" &&
        typeof build === "string" &&
        build.includes("prisma generate") &&
        build.includes("tsc -p tsconfig.doctor.json") &&
        build.includes("next build")
        ? "Railway generates Prisma Client, compiles startup diagnostics, and builds Next.js."
        : "Railway or package build scripts do not match the expected production flow.",
    ),
  );

  return { checks, id: "deployment", title: "Deployment" };
}

function safeErrorMessage(error: unknown): string {
  return redactSecrets(error instanceof Error ? error.message : String(error));
}

function connectionRootCause(
  error: unknown,
  inspection: DatabaseUrlInspection,
): string {
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate?.code === "string" ? candidate.code : null;
  const target = `${inspection.host ?? "unknown host"}:${inspection.port ?? 5432}`;

  if (code === "ECONNREFUSED") {
    return `Connection refused by ${target}. Verify the host, port, and database service.`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return `DNS could not resolve ${inspection.host ?? "the database host"}.`;
  }
  if (code === "28P01") {
    return "PostgreSQL rejected the supplied credentials.";
  }
  if (code === "3D000") {
    return `PostgreSQL cannot find database \"${inspection.database ?? "unknown"}\".`;
  }
  if (code === "ETIMEDOUT" || code === "CONNECT_TIMEOUT") {
    return `Connection to ${target} timed out.`;
  }

  const message = safeErrorMessage(error);
  return code ? `${code}: ${message}` : message;
}

function unavailableDatabaseChecks(reason: string): readonly DoctorCheck[] {
  return ["Areas", "Projects", "Tasks", "Inbox Items", "Daily Reviews", "Users"].map(
    (label) =>
      check(
        `database.${label.toLowerCase().replaceAll(" ", "-")}`,
        label,
        "warning",
        reason,
      ),
  );
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function tableExists(
  client: Client,
  schema: string,
  table: string,
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schema, table],
  );

  return result.rows[0]?.exists === true;
}

async function countRows(
  client: Client,
  schema: string,
  table: string,
  where = "",
  parameters: readonly unknown[] = [],
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}${where}`,
    [...parameters],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function databaseCountCheck(
  client: Client,
  schema: string,
  label: string,
  table: string,
  where = "",
  parameters: readonly unknown[] = [],
  optional = false,
): Promise<DoctorCheck> {
  try {
    if (!(await tableExists(client, schema, table))) {
      return check(
        `database.${label.toLowerCase().replaceAll(" ", "-")}`,
        label,
        optional ? "ok" : "error",
        optional ? "Not implemented." : `Required table ${schema}.${table} is missing.`,
      );
    }

    const count = await countRows(client, schema, table, where, parameters);
    return check(
      `database.${label.toLowerCase().replaceAll(" ", "-")}`,
      label,
      "ok",
      `${count} records.`,
      { count },
    );
  } catch (error) {
    return check(
      `database.${label.toLowerCase().replaceAll(" ", "-")}`,
      label,
      "error",
      `Count failed: ${safeErrorMessage(error)}`,
    );
  }
}

async function connectionAndDatabaseSections(
  value: string | undefined,
  inspection: DatabaseUrlInspection | null,
): Promise<ConnectionChecks> {
  const unavailable = value
    ? "Skipped because DATABASE_URL is invalid or connectivity failed."
    : "Skipped because DATABASE_URL is missing.";

  if (!value || !inspection?.valid) {
    return {
      connectivity: {
        checks: [
          check(
            "connectivity.select-one",
            "Read-only connection",
            "error",
            unavailable,
          ),
        ],
        id: "connectivity",
        title: "Connectivity",
      },
      database: {
        checks: unavailableDatabaseChecks(unavailable),
        id: "database",
        title: "Database",
      },
    };
  }

  const client = new Client({
    application_name: "atlas-doctor",
    connectionString: value,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
    statement_timeout: 5_000,
  });
  const started = performance.now();

  try {
    await client.connect();
    const result = await client.query<{ result: number }>("SELECT 1 AS result");
    if (Number(result.rows[0]?.result) !== 1) {
      throw new Error("SELECT 1 returned an unexpected result.");
    }
    const latency = Math.max(0, Math.round(performance.now() - started));
    const schema = inspection.schema ?? "public";

    const databaseChecks = await Promise.all([
      databaseCountCheck(client, schema, "Areas", "areas"),
      databaseCountCheck(
        client,
        schema,
        "Projects",
        "items",
        ' WHERE "type" = $1',
        ["Project"],
      ),
      databaseCountCheck(
        client,
        schema,
        "Tasks",
        "items",
        ' WHERE "type" = $1',
        ["TASK"],
      ),
      databaseCountCheck(
        client,
        schema,
        "Inbox Items",
        "items",
        ' WHERE "status" = $1',
        ["Inbox"],
      ),
      databaseCountCheck(client, schema, "Daily Reviews", "daily_reviews"),
      databaseCountCheck(client, schema, "Users", "users", "", [], true),
    ]);

    return {
      connectivity: {
        checks: [
          check(
            "connectivity.select-one",
            "Read-only connection",
            "ok",
            `Connected (${latency} ms). SELECT 1 succeeded.`,
            { latencyMs: latency },
          ),
        ],
        id: "connectivity",
        title: "Connectivity",
      },
      database: {
        checks: databaseChecks,
        id: "database",
        title: "Database",
      },
    };
  } catch (error) {
    const cause = connectionRootCause(error, inspection);
    return {
      connectivity: {
        checks: [
          check(
            "connectivity.select-one",
            "Read-only connection",
            "error",
            `Cannot connect: ${cause}`,
          ),
        ],
        id: "connectivity",
        title: "Connectivity",
      },
      database: {
        checks: unavailableDatabaseChecks(
          "Skipped because the read-only connection failed.",
        ),
        id: "database",
        title: "Database",
      },
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const databaseUrl = options.env.DATABASE_URL;
  const directUrl = options.env.DIRECT_URL;
  const databaseInspection = databaseUrl
    ? inspectDatabaseUrl(databaseUrl)
    : null;
  const directInspection = directUrl ? inspectDatabaseUrl(directUrl) : null;
  const connection = await connectionAndDatabaseSections(
    databaseUrl,
    databaseInspection,
  );
  const sections: DoctorSection[] = [
    environmentSection(options.env),
    databaseUrlSection(databaseUrl, databaseInspection),
    directUrlSection(
      databaseUrl,
      databaseInspection,
      directUrl,
      directInspection,
    ),
    prismaSection(options),
    repositorySection(options.cwd),
    connection.connectivity,
    connection.database,
    deploymentSection(options.cwd),
    architectureSection(options.cwd),
  ];

  return createReport(sections, options.now);
}

export {
  architectureSection,
  connectionAndDatabaseSections,
  databaseUrlSection,
  deploymentSection,
  directUrlSection,
  environmentSection,
  prismaSection,
  repositorySection,
  runDoctor,
};
