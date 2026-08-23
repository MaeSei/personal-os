import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type EmptyStateProps = {
  action?: ReactNode;
  description: ReactNode;
  status?: "alert" | "status";
  title: ReactNode;
};

/** Consistent, useful feedback for empty, loading, and recoverable states. */
function EmptyState({ action, description, status, title }: EmptyStateProps) {
  return (
    <Card
      aria-atomic={status ? "true" : undefined}
      aria-live={
        status === "alert" ? "assertive" : status ? "polite" : undefined
      }
      role={status}
      tone="subtle"
    >
      <div className={spacingStyles.detailStack}>
        <h3
          className={cn(
            typographyStyles.cardTitle,
            status === "alert" ? "text-danger" : colorStyles.text.primary,
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            typographyStyles.description,
            colorStyles.text.muted,
          )}
        >
          {description}
        </p>
        {action ? <div className={spacingStyles.heroContent}>{action}</div> : null}
      </div>
    </Card>
  );
}

export { EmptyState, type EmptyStateProps };
