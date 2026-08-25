import type { ComponentPropsWithoutRef } from "react";

import type { Project } from "@/domain";
import { ProjectStatusBadge } from "@/features/projects/components/ProjectStatusBadge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectSummaryProps = Omit<ComponentPropsWithoutRef<"li">, "children"> & {
  project: Project;
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
          <h4 className={typographyStyles.itemTitle}>
            <a
              className={cn(colorStyles.text.primary, colorStyles.focusRing)}
              href={`/projects/${project.id}`}
            >
              {project.title}
            </a>
          </h4>
          <ProjectStatusBadge status={project.status} />
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
