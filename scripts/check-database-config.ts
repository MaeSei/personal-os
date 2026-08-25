import { config as loadDotenv } from "dotenv";

import {
  DEPLOYMENT_DOCUMENTATION,
  RAILWAY_DATABASE_REFERENCE,
  redactSecrets,
  validateDatabaseConfig,
  type DatabaseConfig,
  type DatabaseConfigFinding,
} from "../src/server/config/databaseConfig";

const DIVIDER = "──────────────────────────────";

function overallStatus(config: DatabaseConfig): "ERROR" | "PASS" | "WARNING" {
  if (!config.valid) return "ERROR";
  if (config.findings.some((finding) => finding.severity === "warning")) {
    return "WARNING";
  }
  return "PASS";
}

function exitCode(config: DatabaseConfig, startup: boolean): 0 | 1 | 2 {
  if (startup) return config.safeForStartup ? 0 : 2;
  if (!config.valid) return 2;
  return config.findings.some((finding) => finding.severity === "warning")
    ? 1
    : 0;
}

function mostLikelyCause(finding: DatabaseConfigFinding): string {
  switch (finding.code) {
    case "database_url_local":
    case "direct_url_local":
      return "A stale or manually copied Railway environment variable.";
    case "database_url_example":
    case "direct_url_example":
      return "The example connection string was copied without replacing its placeholders.";
    case "database_url_missing":
      return "The Atlas service is missing its PostgreSQL reference variable.";
    case "database_url_invalid":
    case "direct_url_invalid":
      return "The environment variable is empty or is not a valid PostgreSQL URL.";
    default:
      return "The Railway database variables do not match the intended deployment target.";
  }
}

function renderBlockingError(
  config: DatabaseConfig,
): readonly string[] {
  const finding = config.findings.find((item) => item.startupBlocking);
  if (!finding) return [];

  const inspection =
    finding.field === "DATABASE_URL" ? config.databaseUrl : config.directUrl;

  return [
    "",
    DIVIDER,
    "ATLAS CONFIGURATION ERROR",
    "",
    finding.field,
    "",
    ...(inspection?.host ? ["Host", inspection.host, ""] : []),
    finding.message,
    "",
    "Most likely cause",
    mostLikelyCause(finding),
    "",
    "Recommended fix",
    finding.recommendation ??
      `Replace DATABASE_URL with ${RAILWAY_DATABASE_REFERENCE}.`,
    "",
    "Railway reference",
    RAILWAY_DATABASE_REFERENCE,
    "",
    "See",
    DEPLOYMENT_DOCUMENTATION,
    DIVIDER,
  ];
}

function renderDatabaseConfigReport(
  config: DatabaseConfig,
  startup = false,
): string {
  const lines = [
    "ATLAS DATABASE CONFIGURATION CHECK",
    "",
    "Resolved values",
    `DATABASE_URL: ${config.databaseUrl?.redacted ?? "[MISSING OR INVALID]"}`,
    `DIRECT_URL: ${config.directUrl?.redacted ?? "[NOT SET OR INVALID]"}`,
    `Prisma CLI source: ${config.effectivePrismaSource ?? "[NONE]"}`,
    "Prisma precedence: DIRECT_URL when present, otherwise DATABASE_URL.",
    "Atlas runtime source: DATABASE_URL only.",
    "",
    "Validation",
    ...config.findings.map(
      (finding) =>
        `${finding.severity.toUpperCase()} ${finding.field} — ${finding.message}`,
    ),
    ...renderBlockingError(config),
    "",
    "Overall",
    startup && !config.safeForStartup ? "ERROR" : overallStatus(config),
    startup && !config.safeForStartup
      ? "Startup aborted before Prisma migrations."
      : startup
        ? "Startup configuration is safe."
        : `Exit code: ${exitCode(config, false)}`,
  ];

  return `${redactSecrets(lines.join("\n"))}\n`;
}

async function main(): Promise<void> {
  loadDotenv({ quiet: true });

  const startup = process.argv.includes("--startup");
  const config = validateDatabaseConfig();

  process.stdout.write(renderDatabaseConfigReport(config, startup));
  process.exitCode = exitCode(config, startup);
}

if (require.main === module) {
  void main();
}

export { exitCode, main, renderDatabaseConfigReport };
