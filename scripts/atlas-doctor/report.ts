import { redactSecrets } from "./database-url";
import type {
  DoctorCheck,
  DoctorExitCode,
  DoctorReport,
  DoctorSection,
  DoctorStatus,
  DoctorSummary,
} from "./types";

const STATUS_SYMBOL: Readonly<Record<DoctorStatus, string>> = {
  error: "✗",
  ok: "✓",
  warning: "⚠",
};

function calculateExitCode(
  statuses: readonly DoctorStatus[],
): DoctorExitCode {
  if (statuses.includes("error")) return 2;
  if (statuses.includes("warning")) return 1;
  return 0;
}

function summarize(sections: readonly DoctorSection[]): DoctorSummary {
  const checks = sections.flatMap((section) => section.checks);
  const statuses = checks.map((check) => check.status);
  const exitCode = calculateExitCode(statuses);

  return {
    errors: statuses.filter((status) => status === "error").length,
    exitCode,
    ok: statuses.filter((status) => status === "ok").length,
    overall:
      exitCode === 0
        ? "ATLAS READY"
        : exitCode === 1
          ? "ATLAS READY WITH WARNINGS"
          : "ATLAS NOT READY",
    warnings: statuses.filter((status) => status === "warning").length,
  };
}

function createReport(
  sections: readonly DoctorSection[],
  now = new Date(),
): DoctorReport {
  return {
    generatedAt: now.toISOString(),
    sections,
    summary: summarize(sections),
    title: "ATLAS DOCTOR REPORT",
    version: 1,
  };
}

function formatDetails(check: DoctorCheck): readonly string[] {
  if (!check.details) return [];

  return Object.entries(check.details).map(
    ([key, value]) => `    ${key}: ${String(value)}`,
  );
}

function renderHumanReport(report: DoctorReport): string {
  const lines: string[] = [
    report.title,
    `Generated ${report.generatedAt}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(section.title);

    for (const check of section.checks) {
      lines.push(
        `${STATUS_SYMBOL[check.status]} ${check.label} — ${check.message}`,
        ...formatDetails(check),
      );
    }

    lines.push("");
  }

  const warnings = report.sections.flatMap((section) =>
    section.checks
      .filter((check) => check.status === "warning")
      .map((check) => `${section.title}: ${check.label} — ${check.message}`),
  );
  const errors = report.sections.flatMap((section) =>
    section.checks
      .filter((check) => check.status === "error")
      .map((check) => `${section.title}: ${check.label} — ${check.message}`),
  );

  lines.push("Summary");
  lines.push(
    `✓ ${report.summary.ok} passed`,
    `⚠ ${report.summary.warnings} warnings`,
    `✗ ${report.summary.errors} errors`,
    "",
    "Warnings",
    ...(warnings.length > 0 ? warnings.map((warning) => `- ${warning}`) : ["None"]),
  );

  if (errors.length > 0) {
    lines.push("", "Errors", ...errors.map((error) => `- ${error}`));
  }

  lines.push(
    "",
    "Overall",
    report.summary.overall,
    `Exit code: ${report.summary.exitCode}`,
  );

  return `${redactSecrets(lines.join("\n"))}\n`;
}

function renderJsonReport(report: DoctorReport): string {
  return `${redactSecrets(JSON.stringify(report, null, 2))}\n`;
}

export {
  calculateExitCode,
  createReport,
  renderHumanReport,
  renderJsonReport,
};
