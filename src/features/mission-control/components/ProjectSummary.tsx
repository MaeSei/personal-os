import type { ComponentPropsWithoutRef } from "react";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Status, type Project, type ProjectStatus } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectSummaryProps = Omit<ComponentPropsWithoutRef<"li">, "children"> & {
  project: Project;
};

const statusVariant: Record<ProjectStatus, BadgeVariant> = {
  [Status.Active]: "attention",
  [Status.Archived]: "neutral",
  [Status.Blocked]: "blocked",
  [Status.Completed]: "success",
  [Status.Someday]: "neutral",
  [Status.Waiting]: "warning",
};

function ProjectSummary({ className, project, ...props }: ProjectSummaryProps) {
  return (
    <li
      className={cn("py-card first:pt-0 last:pb-0", className)}
      data-slot="project-summary"
      {...props}
    >
      <div className={spacingStyles.detailStack}>
        <div className="flex items-start justify-between gap-cluster">
          <h4 className={typographyStyles.itemTitle}>{project.title}</h4>
          <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
        </div>
        <div className={spacingStyles.detailStack}>
          <p className={cn(typographyStyles.label, colorStyles.text.accent)}>
            Outcome
          </p>
          <p
            className={cn(
              typographyStyles.description,
              colorStyles.text.muted,
            )}
          >
            {project.outcome}
          </p>
        </div>
        <p
          className={cn(
            typographyStyles.metricValue,
            colorStyles.text.muted,
          )}
        >
          Energy {project.energyLevel} of 5
        </p>
      </div>
    </li>
  );
}

export { ProjectSummary, type ProjectSummaryProps };
