type DoctorStatus = "error" | "ok" | "warning";

type DoctorDetailValue = boolean | number | string | null;

type DoctorCheck = {
  readonly details?: Readonly<Record<string, DoctorDetailValue>>;
  readonly id: string;
  readonly label: string;
  readonly message: string;
  readonly status: DoctorStatus;
};

type DoctorSection = {
  readonly checks: readonly DoctorCheck[];
  readonly id: string;
  readonly title: string;
};

type DoctorExitCode = 0 | 1 | 2;

type DoctorSummary = {
  readonly errors: number;
  readonly exitCode: DoctorExitCode;
  readonly ok: number;
  readonly overall: "ATLAS NOT READY" | "ATLAS READY" | "ATLAS READY WITH WARNINGS";
  readonly warnings: number;
};

type DoctorReport = {
  readonly generatedAt: string;
  readonly sections: readonly DoctorSection[];
  readonly summary: DoctorSummary;
  readonly title: "ATLAS DOCTOR REPORT";
  readonly version: 1;
};

type DoctorOptions = {
  readonly commandTimeoutMs?: number;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly now?: Date;
};

export type {
  DoctorCheck,
  DoctorDetailValue,
  DoctorExitCode,
  DoctorOptions,
  DoctorReport,
  DoctorSection,
  DoctorStatus,
  DoctorSummary,
};
