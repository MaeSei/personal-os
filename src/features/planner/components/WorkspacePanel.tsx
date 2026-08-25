"use client";

import { useId, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspacePanelProps = {
  readonly children: ReactNode;
  readonly count?: number;
  readonly defaultExpanded?: boolean;
  readonly description?: string;
  readonly title: string;
};

function WorkspacePanel({
  children,
  count,
  defaultExpanded = true,
  description,
  title,
}: WorkspacePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId}>
      <Card padding="none">
        <div className={cn("flex items-start justify-between", spacingStyles.cardPadding.sm)}>
          <div className={spacingStyles.detailStack}>
            <div className={spacingStyles.cluster}>
              <h2 className={typographyStyles.cardTitle} id={titleId}>{title}</h2>
              {typeof count === "number" ? <Badge variant="neutral">{count}</Badge> : null}
            </div>
            {description ? (
              <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                {description}
              </p>
            ) : null}
          </div>
          <Button
            aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
            aria-controls={contentId}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            size="sm"
            variant="ghost"
          >
            {expanded ? "Hide" : "Show"}
          </Button>
        </div>
        <div
          className={cn("border-t", spacingStyles.cardPadding.sm)}
          hidden={!expanded}
          id={contentId}
        >
          {children}
        </div>
      </Card>
    </section>
  );
}

export { WorkspacePanel };
