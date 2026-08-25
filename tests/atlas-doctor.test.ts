import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import {
  inspectDatabaseUrl,
  redactSecrets,
} from "../scripts/atlas-doctor/database-url";
import {
  calculateExitCode,
  createReport,
  renderJsonReport,
} from "../scripts/atlas-doctor/report";
import type { DoctorSection } from "../scripts/atlas-doctor/types";

test("database URL parsing exposes safe PostgreSQL connection metadata", () => {
  const inspection = inspectDatabaseUrl(
    "postgresql://atlas:super-secret@atlas-db.railway.internal:5432/atlas?schema=private&sslmode=require",
  );

  assert.equal(inspection.valid, true);
  assert.equal(inspection.provider, "postgresql");
  assert.equal(inspection.host, "atlas-db.railway.internal");
  assert.equal(inspection.port, 5432);
  assert.equal(inspection.database, "atlas");
  assert.equal(inspection.schema, "private");
  assert.equal(inspection.ssl, "enabled");
  assert.doesNotMatch(inspection.redacted, /atlas:super-secret/);
  assert.match(inspection.redacted, /\[REDACTED\]@atlas-db\.railway\.internal/);
});

test("host validation distinguishes local warnings from invalid placeholders", () => {
  const local = inspectDatabaseUrl(
    "postgresql://atlas:secret@localhost:5432/atlas",
  );
  const invalid = inspectDatabaseUrl(
    "postgresql://atlas:secret@host:5432/atlas",
  );

  assert.equal(local.valid, true);
  assert.deepEqual(
    local.issues.map((issue) => [issue.code, issue.status]),
    [["host_local", "warning"]],
  );
  assert.equal(invalid.valid, false);
  assert.deepEqual(
    invalid.issues.map((issue) => [issue.code, issue.status]),
    [["host_invalid", "error"]],
  );
});

test("redaction removes URL credentials and named secrets", () => {
  const source = [
    "postgresql://atlas:super-secret@database.internal:5432/atlas",
    "DATABASE_URL=postgresql://other:password@localhost:5432/atlas",
    "https://example.test/?token=private-token&ssl=true",
    '{"password":"json-secret"}',
  ].join("\n");
  const redacted = redactSecrets(source);

  for (const secret of [
    "super-secret",
    "other:password",
    "private-token",
    "json-secret",
  ]) {
    assert.equal(redacted.includes(secret), false);
  }
  assert.match(redacted, /postgresql:\/\/\[REDACTED\]@database\.internal/);
});

test("exit codes distinguish ready, warning, and blocking reports", () => {
  assert.equal(calculateExitCode(["ok", "ok"]), 0);
  assert.equal(calculateExitCode(["ok", "warning"]), 1);
  assert.equal(calculateExitCode(["warning", "error"]), 2);
});

test("JSON rendering produces a structured, redacted report", () => {
  const sections: readonly DoctorSection[] = [
    {
      checks: [
        {
          details: {
            value: "postgresql://atlas:secret@database.internal:5432/atlas",
          },
          id: "environment.database_url",
          label: "DATABASE_URL",
          message: "Present.",
          status: "ok",
        },
      ],
      id: "environment",
      title: "Environment",
    },
  ];
  const output = renderJsonReport(
    createReport(sections, new Date("2026-08-25T10:00:00.000Z")),
  );
  const parsed = JSON.parse(output) as {
    summary: { exitCode: number; overall: string };
    title: string;
    version: number;
  };

  assert.equal(parsed.title, "ATLAS DOCTOR REPORT");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.summary.exitCode, 0);
  assert.equal(parsed.summary.overall, "ATLAS READY");
  assert.equal(output.includes("atlas:secret"), false);
});

test("doctor JSON mode writes only structured JSON and returns its exit code", () => {
  const executable = path.join(
    process.cwd(),
    ".test-dist/scripts/atlas-doctor.js",
  );
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DIRECT_URL;
  const result = spawnSync(process.execPath, [executable, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  const parsed = JSON.parse(result.stdout) as {
    sections: readonly unknown[];
    summary: { exitCode: number; overall: string };
    title: string;
  };

  assert.equal(result.stderr, "");
  assert.equal(result.status, 2);
  assert.equal(parsed.title, "ATLAS DOCTOR REPORT");
  assert.equal(parsed.sections.length, 9);
  assert.equal(parsed.summary.exitCode, 2);
  assert.equal(parsed.summary.overall, "ATLAS NOT READY");
});
