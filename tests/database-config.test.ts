import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  RAILWAY_DATABASE_REFERENCE,
  parseDatabaseUrl,
  redactSecrets,
  validateDatabaseConfig,
} from "../src/server/config/databaseConfig";
import {
  exitCode,
  renderDatabaseConfigReport,
} from "../scripts/check-database-config";

const railwayDatabaseUrl =
  "postgresql://atlas:railway-secret@atlas-db.railway.internal:5432/atlas";

test("missing DATABASE_URL is a startup-blocking error", () => {
  const config = validateDatabaseConfig({});

  assert.equal(config.valid, false);
  assert.equal(config.safeForStartup, false);
  assert.equal(config.effectivePrismaSource, null);
  assert.equal(
    config.findings.some(
      (finding) =>
        finding.code === "database_url_missing" && finding.severity === "error",
    ),
    true,
  );
  assert.equal(exitCode(config, true), 2);
});

test("localhost DATABASE_URL is rejected before startup", () => {
  const config = validateDatabaseConfig({
    DATABASE_URL: "postgresql://atlas:secret@localhost:5432/atlas",
  });

  assert.equal(config.databaseUrl?.host, "localhost");
  assert.equal(config.valid, false);
  assert.equal(config.safeForStartup, false);
  assert.equal(
    config.findings.some((finding) => finding.code === "database_url_local"),
    true,
  );
});

test("127.0.0.1 DATABASE_URL is rejected before startup", () => {
  const config = validateDatabaseConfig({
    DATABASE_URL: "postgresql://atlas:secret@127.0.0.1:5432/atlas",
  });

  assert.equal(config.databaseUrl?.host, "127.0.0.1");
  assert.equal(config.valid, false);
  assert.equal(config.safeForStartup, false);
});

test("malformed URLs and placeholder host are invalid", () => {
  const malformed = validateDatabaseConfig({ DATABASE_URL: "not a url" });
  const placeholder = validateDatabaseConfig({
    DATABASE_URL: "postgresql://atlas:secret@host:5432/atlas",
  });

  assert.equal(malformed.valid, false);
  assert.equal(malformed.databaseUrl?.issues[0]?.code, "parse_failed");
  assert.equal(placeholder.valid, false);
  assert.equal(
    placeholder.databaseUrl?.issues.some((issue) => issue.code === "host_invalid"),
    true,
  );
});

test("DIRECT_URL takes Prisma precedence and target differences warn", () => {
  const config = validateDatabaseConfig({
    DATABASE_URL: railwayDatabaseUrl,
    DIRECT_URL:
      "postgresql://atlas:direct-secret@atlas-direct.railway.internal:5432/atlas",
  });

  assert.equal(config.effectivePrismaSource, "DIRECT_URL");
  assert.equal(config.valid, true);
  assert.equal(config.safeForStartup, true);
  assert.equal(
    config.findings.some(
      (finding) =>
        finding.code === "direct_url_different" &&
        finding.severity === "warning" &&
        finding.startupBlocking === false,
    ),
    true,
  );
  assert.equal(exitCode(config, false), 1);
  assert.equal(exitCode(config, true), 0);
});

test("local DIRECT_URL warns and blocks the pre-migration startup gate", () => {
  const config = validateDatabaseConfig({
    DATABASE_URL: railwayDatabaseUrl,
    DIRECT_URL: "postgresql://atlas:secret@localhost:5432/atlas",
  });

  assert.equal(config.valid, true);
  assert.equal(config.safeForStartup, false);
  assert.equal(
    config.findings.some(
      (finding) =>
        finding.code === "direct_url_local" && finding.severity === "warning",
    ),
    true,
  );
  assert.equal(exitCode(config, true), 2);
});

test("configuration output redacts credentials", () => {
  const config = validateDatabaseConfig({ DATABASE_URL: railwayDatabaseUrl });
  const output = renderDatabaseConfigReport(config);

  assert.equal(output.includes("railway-secret"), false);
  assert.equal(output.includes("atlas:railway-secret"), false);
  assert.match(output, /postgresql:\/\/\[REDACTED\]@atlas-db\.railway\.internal/);
  assert.equal(
    redactSecrets("postgresql://atlas:secret@database.internal/atlas").includes(
      "secret",
    ),
    false,
  );
});

test("errors provide Railway reference guidance without exposing a password", () => {
  const config = validateDatabaseConfig({
    DATABASE_URL: "postgresql://atlas:do-not-print@localhost:5432/atlas",
  });
  const output = renderDatabaseConfigReport(config, true);

  assert.match(output, /ATLAS CONFIGURATION ERROR/);
  assert.match(output, /Most likely cause/);
  assert.match(output, /Recommended fix/);
  assert.match(output, /docs\/deployment\.md/);
  assert.equal(output.includes(RAILWAY_DATABASE_REFERENCE), true);
  assert.equal(output.includes("do-not-print"), false);
});

test(".env.example contains fake placeholders and no local database host", () => {
  const example = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");

  assert.match(example, /USERNAME:PASSWORD@YOUR_POSTGRES_HOST/);
  assert.doesNotMatch(example, /@localhost(?::|\/)/i);
  assert.doesNotMatch(example, /@127\.0\.0\.1(?::|\/)/);
  assert.equal(
    parseDatabaseUrl(
      "postgresql://USERNAME:PASSWORD@YOUR_POSTGRES_HOST:5432/atlas",
    ).host,
    "your_postgres_host",
  );
});

test("copied .env.example placeholders warn and block production startup", () => {
  const config = validateDatabaseConfig({
    DATABASE_URL:
      "postgresql://USERNAME:PASSWORD@YOUR_POSTGRES_HOST:5432/atlas",
  });

  assert.equal(config.valid, true);
  assert.equal(config.safeForStartup, false);
  assert.equal(
    config.findings.some(
      (finding) =>
        finding.code === "database_url_example" &&
        finding.severity === "warning",
    ),
    true,
  );
});

test("production startup validates configuration before migrations", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const startup = packageJson.scripts["start:migrate"] ?? "";
  const build = packageJson.scripts.build ?? "";

  assert.ok(startup.indexOf("config:check:startup") >= 0);
  assert.ok(
    startup.indexOf("config:check:startup") <
      startup.indexOf("db:migrate:deploy"),
  );
  assert.ok(startup.indexOf("db:migrate:deploy") < startup.indexOf("npm start"));
  assert.match(build, /tsc -p tsconfig\.doctor\.json/);
});

test("configuration validation has no database or Prisma dependency", () => {
  const sources = [
    "scripts/check-database-config.ts",
    "src/server/config/databaseConfig.ts",
  ].map((file) => readFileSync(path.join(process.cwd(), file), "utf8"));

  for (const source of sources) {
    assert.doesNotMatch(source, /from\s+["']pg["']/);
    assert.doesNotMatch(source, /@prisma|PrismaClient|\.query\s*\(/);
  }
});
