import { config as loadDotenv } from "dotenv";

import { runDoctor } from "./atlas-doctor/checks";
import { renderHumanReport, renderJsonReport } from "./atlas-doctor/report";
import { redactSecrets } from "./atlas-doctor/database-url";

async function main(): Promise<void> {
  loadDotenv({ quiet: true });

  const json = process.argv.includes("--json");

  try {
    const report = await runDoctor({
      cwd: process.cwd(),
      env: process.env,
    });

    process.stdout.write(
      json ? renderJsonReport(report) : renderHumanReport(report),
    );
    process.exitCode = report.summary.exitCode;
  } catch (error) {
    const message = redactSecrets(
      error instanceof Error ? error.message : String(error),
    );

    if (json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            error: message,
            summary: { exitCode: 2, overall: "ATLAS NOT READY" },
            title: "ATLAS DOCTOR REPORT",
            version: 1,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stderr.write(`ATLAS DOCTOR REPORT\n\n✗ Doctor failed — ${message}\n`);
    }

    process.exitCode = 2;
  }
}

if (require.main === module) {
  void main();
}

export { main };
