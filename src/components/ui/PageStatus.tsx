import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { PageContainer } from "@/components/ui/PageContainer";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type PageStatusProps = {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
  tone?: "danger" | "loading";
};

/** Calm full-page feedback for client loading and recoverable failures. */
function PageStatus({
  action,
  description,
  title,
  tone = "loading",
}: PageStatusProps) {
  const isError = tone === "danger";

  return (
    <PageContainer className="flex items-center justify-center">
      <div
        aria-atomic="true"
        aria-busy={!isError}
        aria-live={isError ? "assertive" : "polite"}
        className={cn(
          "mx-auto w-full max-w-xl text-center",
          spacingStyles.cardStack,
        )}
        role={isError ? "alert" : "status"}
      >
        <Badge
          className={isError ? undefined : motionStyles.loading}
          variant={isError ? "blocked" : "attention"}
        >
          {isError ? "Needs attention" : "Loading"}
        </Badge>
        <h1
          className={cn(
            typographyStyles.sectionTitle,
            colorStyles.text.primary,
          )}
        >
          {title}
        </h1>
        <p className={cn(typographyStyles.lead, colorStyles.text.muted)}>
          {description}
        </p>
        {action ? (
          <div className={cn(spacingStyles.cluster, "justify-center")}>{action}</div>
        ) : null}
      </div>
    </PageContainer>
  );
}

export { PageStatus, type PageStatusProps };
