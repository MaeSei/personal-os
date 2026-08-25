"use client";

import { useId, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type CollapsiblePanelProps = {
  readonly children: ReactNode;
  readonly count?: number;
  readonly defaultExpanded?: boolean;
  readonly description?: string;
  readonly headingLevel?: "h2" | "h3";
  readonly title: ReactNode;
};

/** A keyboard-accessible disclosure surface shared by workspace collections. */
function CollapsiblePanel({
  children,
  count,
  defaultExpanded = true,
  description,
  headingLevel: Heading = "h2",
  title,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId}>
      <Card padding="none">
        <div
          className={cn(
            "flex items-start justify-between",
            spacingStyles.cardPadding.sm,
          )}
        >
          <div className={spacingStyles.detailStack}>
            <div className={spacingStyles.cluster}>
              <Heading className={typographyStyles.cardTitle} id={titleId}>
                {title}
              </Heading>
              {typeof count === "number" ? (
                <Badge variant="neutral">{count}</Badge>
              ) : null}
            </div>
            {description ? (
              <p
                className={cn(
                  typographyStyles.description,
                  colorStyles.text.muted,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button
            aria-controls={contentId}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${String(title)}`}
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

export { CollapsiblePanel, type CollapsiblePanelProps };
