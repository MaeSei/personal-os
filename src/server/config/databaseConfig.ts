const LOCAL_DATABASE_HOSTS = new Set([
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "localhost",
]);
const INVALID_DATABASE_HOSTS = new Set(["host", "hostname"]);
const POSTGRES_PROVIDERS = new Set(["postgres", "postgresql"]);

const RAILWAY_DATABASE_REFERENCE = "${{Postgres.DATABASE_URL}}";
const DEPLOYMENT_DOCUMENTATION = "docs/deployment.md";

type DatabaseUrlIssue = {
  readonly code:
    | "database_missing"
    | "host_invalid"
    | "host_local"
    | "parse_failed"
    | "provider_invalid"
    | "ssl_disabled";
  readonly message: string;
  readonly status: "error" | "warning";
};

type DatabaseUrlInspection = {
  readonly database: string | null;
  readonly host: string | null;
  readonly issues: readonly DatabaseUrlIssue[];
  readonly port: number | null;
  readonly provider: string | null;
  readonly redacted: string;
  readonly schema: string | null;
  readonly ssl: "disabled" | "enabled" | "not specified";
  readonly valid: boolean;
};

type DatabaseConfigFinding = {
  readonly code:
    | "database_url_example"
    | "database_url_invalid"
    | "database_url_local"
    | "database_url_missing"
    | "database_url_ssl_disabled"
    | "database_url_valid"
    | "direct_url_different"
    | "direct_url_example"
    | "direct_url_invalid"
    | "direct_url_local"
    | "direct_url_missing"
    | "direct_url_same";
  readonly field: "DATABASE_URL" | "DIRECT_URL";
  readonly message: string;
  readonly recommendation?: string;
  readonly severity: "error" | "pass" | "warning";
  readonly startupBlocking: boolean;
};

type DatabaseConfig = {
  readonly databaseUrl: DatabaseUrlInspection | null;
  readonly directUrl: DatabaseUrlInspection | null;
  readonly effectivePrismaSource: "DATABASE_URL" | "DIRECT_URL" | null;
  readonly findings: readonly DatabaseConfigFinding[];
  readonly safeForStartup: boolean;
  readonly valid: boolean;
};

type DatabaseEnvironment = {
  readonly DATABASE_URL?: string;
  readonly DIRECT_URL?: string;
};

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sslState(url: URL): DatabaseUrlInspection["ssl"] {
  const mode = url.searchParams.get("sslmode")?.toLowerCase();
  const ssl = url.searchParams.get("ssl")?.toLowerCase();

  if (mode === "disable" || ssl === "false" || ssl === "0") {
    return "disabled";
  }

  if (
    mode === "require" ||
    mode === "verify-ca" ||
    mode === "verify-full" ||
    ssl === "true" ||
    ssl === "1"
  ) {
    return "enabled";
  }

  return "not specified";
}

function buildRedactedUrl(url: URL): string {
  const provider = url.protocol.replace(/:$/, "");
  const credentials = url.username || url.password ? "[REDACTED]@" : "";
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const host = hostname.includes(":") ? `[${hostname}]` : hostname;
  const port = url.port ? `:${url.port}` : "";
  const safeParameters = new URLSearchParams();

  for (const key of ["schema", "ssl", "sslmode"]) {
    const value = url.searchParams.get(key);
    if (value !== null) safeParameters.set(key, value);
  }

  const query = safeParameters.size > 0 ? `?${safeParameters.toString()}` : "";

  return `${provider}://${credentials}${host}${port}${url.pathname}${query}`;
}

function parseDatabaseUrl(value: string): DatabaseUrlInspection {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return {
      database: null,
      host: null,
      issues: [
        {
          code: "parse_failed",
          message: "The value is not a valid connection URL.",
          status: "error",
        },
      ],
      port: null,
      provider: null,
      redacted: "[INVALID DATABASE URL REDACTED]",
      schema: null,
      ssl: "not specified",
      valid: false,
    };
  }

  const database = decode(url.pathname.replace(/^\//, "")) || null;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase() || null;
  const port = url.port ? Number(url.port) : 5432;
  const provider = url.protocol.replace(/:$/, "").toLowerCase() || null;
  const schema = url.searchParams.get("schema") || "public";
  const ssl = sslState(url);
  const issues: DatabaseUrlIssue[] = [];

  if (!provider || !POSTGRES_PROVIDERS.has(provider)) {
    issues.push({
      code: "provider_invalid",
      message: "Provider must be postgresql or postgres.",
      status: "error",
    });
  }

  if (!host || INVALID_DATABASE_HOSTS.has(host)) {
    issues.push({
      code: "host_invalid",
      message: host
        ? `Host \"${host}\" looks like an unresolved placeholder.`
        : "Database host is missing.",
      status: "error",
    });
  } else if (LOCAL_DATABASE_HOSTS.has(host)) {
    issues.push({
      code: "host_local",
      message: `Host \"${host}\" is local to the current machine or container.`,
      status: "warning",
    });
  }

  if (!database) {
    issues.push({
      code: "database_missing",
      message: "Database name is missing from the URL path.",
      status: "error",
    });
  }

  if (ssl === "disabled" && host && !LOCAL_DATABASE_HOSTS.has(host)) {
    issues.push({
      code: "ssl_disabled",
      message: "SSL is explicitly disabled for a non-local host.",
      status: "warning",
    });
  }

  return {
    database,
    host,
    issues,
    port,
    provider,
    redacted: buildRedactedUrl(url),
    schema,
    ssl,
    valid: !issues.some((issue) => issue.status === "error"),
  };
}

function databaseTargetsDiffer(
  first: DatabaseUrlInspection,
  second: DatabaseUrlInspection,
): boolean {
  if (!first.valid || !second.valid) return false;

  return (
    first.host !== second.host ||
    first.port !== second.port ||
    first.database !== second.database ||
    first.schema !== second.schema
  );
}

function redactSecrets(value: string): string {
  return value
    .replace(
      /\b(postgresql|postgres):\/\/[^\s/@]+(?::[^\s/@]*)?@/gi,
      "$1://[REDACTED]@",
    )
    .replace(
      /\b(DATABASE_URL|DIRECT_URL)\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /([?&](?:password|pass|token|secret)=)[^&\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /("(?:password|pass|token|secret)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"',
    );
}

function looksCopiedFromExample(value: string): boolean {
  try {
    const url = new URL(value);
    const username = decode(url.username).toUpperCase();
    const password = decode(url.password).toUpperCase();
    const host = url.hostname.toUpperCase();

    return (
      username === "USERNAME" ||
      password === "PASSWORD" ||
      host.includes("YOUR_POSTGRES_HOST") ||
      host.includes("YOUR-POSTGRES-HOST")
    );
  } catch {
    return false;
  }
}

function finding(
  value: Omit<DatabaseConfigFinding, "startupBlocking"> & {
    readonly startupBlocking?: boolean;
  },
): DatabaseConfigFinding {
  return {
    ...value,
    startupBlocking:
      value.startupBlocking ?? value.severity === "error",
  };
}

function invalidUrlMessage(
  field: "DATABASE_URL" | "DIRECT_URL",
  inspection: DatabaseUrlInspection,
): string {
  const issue = inspection.issues.find((candidate) => candidate.status === "error");
  return `${field} is invalid. ${issue?.message ?? "Check its URL structure."}`;
}

function validateDatabaseConfig(
  env?: DatabaseEnvironment,
): DatabaseConfig {
  const environment = env ?? {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
  };
  const findings: DatabaseConfigFinding[] = [];
  const databaseValue = environment.DATABASE_URL;
  const directValue = environment.DIRECT_URL;
  const databaseUrl = databaseValue?.trim()
    ? parseDatabaseUrl(databaseValue)
    : null;
  const directUrl = directValue?.trim() ? parseDatabaseUrl(directValue) : null;

  if (!databaseValue?.trim()) {
    findings.push(
      finding({
        code: "database_url_missing",
        field: "DATABASE_URL",
        message: "DATABASE_URL is required before Atlas can start.",
        recommendation: `Set DATABASE_URL to the Railway reference ${RAILWAY_DATABASE_REFERENCE}.`,
        severity: "error",
      }),
    );
  } else if (!databaseUrl?.valid) {
    findings.push(
      finding({
        code: "database_url_invalid",
        field: "DATABASE_URL",
        message: invalidUrlMessage("DATABASE_URL", databaseUrl as DatabaseUrlInspection),
        recommendation: `Replace it with the Railway reference ${RAILWAY_DATABASE_REFERENCE}.`,
        severity: "error",
      }),
    );
  } else {
    const localHost = databaseUrl.issues.some((issue) => issue.code === "host_local");
    findings.push(
      finding(
        localHost
          ? {
              code: "database_url_local",
              field: "DATABASE_URL",
              message: `DATABASE_URL host \"${databaseUrl.host}\" is not valid for Railway deployment.`,
              recommendation: `Replace DATABASE_URL with ${RAILWAY_DATABASE_REFERENCE}.`,
              severity: "error",
            }
          : {
              code: "database_url_valid",
              field: "DATABASE_URL",
              message: "DATABASE_URL is valid and does not target a local host.",
              severity: "pass",
            },
      ),
    );

    if (looksCopiedFromExample(databaseValue)) {
      findings.push(
        finding({
          code: "database_url_example",
          field: "DATABASE_URL",
          message: "DATABASE_URL appears to contain .env.example placeholders.",
          recommendation: `Use the Railway reference ${RAILWAY_DATABASE_REFERENCE} instead of a copied example.`,
          severity: "warning",
          startupBlocking: true,
        }),
      );
    }

    for (const issue of databaseUrl.issues.filter(
      (candidate) => candidate.code === "ssl_disabled",
    )) {
      findings.push(
        finding({
          code: "database_url_ssl_disabled",
          field: "DATABASE_URL",
          message: issue.message,
          severity: "warning",
          startupBlocking: false,
        }),
      );
    }
  }

  if (directValue === undefined) {
    findings.push(
      finding({
        code: "direct_url_missing",
        field: "DIRECT_URL",
        message: "DIRECT_URL is not set; Prisma CLI will use DATABASE_URL.",
        severity: "pass",
      }),
    );
  } else if (!directValue.trim() || !directUrl?.valid) {
    findings.push(
      finding({
        code: "direct_url_invalid",
        field: "DIRECT_URL",
        message: directValue.trim()
          ? invalidUrlMessage("DIRECT_URL", directUrl as DatabaseUrlInspection)
          : "DIRECT_URL is empty and shadows DATABASE_URL for Prisma CLI commands.",
        recommendation:
          "Delete DIRECT_URL unless DATABASE_URL intentionally uses a transaction pooler.",
        severity: "error",
      }),
    );
  } else {
    const directIsLocal = directUrl.issues.some(
      (issue) => issue.code === "host_local",
    );
    const directLooksCopied = looksCopiedFromExample(directValue);
    if (directIsLocal) {
      findings.push(
        finding({
          code: "direct_url_local",
          field: "DIRECT_URL",
          message: `DIRECT_URL host \"${directUrl.host}\" is local and would override DATABASE_URL for migrations.`,
          recommendation:
            "Delete DIRECT_URL or replace it with an intentional direct Railway database URL.",
          severity: "warning",
          startupBlocking: true,
        }),
      );
    }

    if (directLooksCopied) {
      findings.push(
        finding({
          code: "direct_url_example",
          field: "DIRECT_URL",
          message: "DIRECT_URL appears to contain .env.example placeholders.",
          recommendation:
            "Delete DIRECT_URL or replace it with an intentional direct Railway database reference.",
          severity: "warning",
          startupBlocking: true,
        }),
      );
    }

    if (databaseUrl?.valid && databaseTargetsDiffer(databaseUrl, directUrl)) {
      findings.push(
        finding({
          code: "direct_url_different",
          field: "DIRECT_URL",
          message:
            "DIRECT_URL points to a different host, port, database, or schema than DATABASE_URL.",
          recommendation:
            "Confirm this is intentional and that DIRECT_URL is the direct target for migrations.",
          severity: "warning",
          startupBlocking: false,
        }),
      );
    } else if (!directIsLocal && !directLooksCopied && databaseUrl?.valid) {
      findings.push(
        finding({
          code: "direct_url_same",
          field: "DIRECT_URL",
          message: "DIRECT_URL and DATABASE_URL resolve to the same database target.",
          severity: "pass",
        }),
      );
    }
  }

  const valid = !findings.some((item) => item.severity === "error");
  const safeForStartup = !findings.some((item) => item.startupBlocking);

  return {
    databaseUrl,
    directUrl,
    effectivePrismaSource: directValue !== undefined ? "DIRECT_URL" : databaseValue ? "DATABASE_URL" : null,
    findings,
    safeForStartup,
    valid,
  };
}

export {
  DEPLOYMENT_DOCUMENTATION,
  RAILWAY_DATABASE_REFERENCE,
  databaseTargetsDiffer,
  parseDatabaseUrl,
  redactSecrets,
  validateDatabaseConfig,
};
export type {
  DatabaseConfig,
  DatabaseConfigFinding,
  DatabaseEnvironment,
  DatabaseUrlInspection,
  DatabaseUrlIssue,
};
