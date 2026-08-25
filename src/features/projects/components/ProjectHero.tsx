import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ProjectDetail } from "@/domain";
import { ProjectStatusBadge } from "@/features/projects/components/ProjectStatusBadge";
import {
  formatActivity,
  formatRemainingEffort,
} from "@/features/projects/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectHeroProps = { readonly detail: ProjectDetail };

function ProjectHero({ detail: { area, metrics, project } }: ProjectHeroProps) {
  const progressLabel = metrics.progressSource === "milestones"
    ? "Milestone progress"
    : "Task completion evidence";
  const progressValue = metrics.progressSource === "milestones"
    ? `${metrics.milestoneCounts.completed} of ${metrics.milestoneCounts.total}`
    : `${metrics.counts.completed} completed`;

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <header className={spacingStyles.detailStack}>
          <div className={spacingStyles.cluster}>
            <ProjectStatusBadge status={project.status} />
            <Badge variant="neutral">
              <span aria-hidden="true">{area?.icon ?? "○"}</span>&nbsp;
              {area?.title ?? "Unknown Area"}
            </Badge>
          </div>
          <p className={cn(typographyStyles.label, colorStyles.text.accent)}>Outcome</p>
          <p className={cn(typographyStyles.lead, colorStyles.text.primary)}>{project.outcome}</p>
          {project.description && project.description !== project.outcome ? (
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>{project.description}</p>
          ) : null}
        </header>
        <div>
          <div className="flex justify-between gap-cluster">
            <span className={typographyStyles.metricLabel}>{progressLabel}</span>
            <span className={typographyStyles.metricValue}>{progressValue}</span>
          </div>
          <progress className="mt-detail h-2 w-full accent-accent" max={100} value={metrics.progress}>{metrics.progress}%</progress>
        </div>
        <dl className="grid grid-cols-2 gap-card sm:grid-cols-4">
          <div><dt className={colorStyles.text.muted}>Open</dt><dd className={typographyStyles.cardTitle}>{metrics.counts.open}</dd></div>
          <div><dt className={colorStyles.text.muted}>Completed</dt><dd className={typographyStyles.cardTitle}>{metrics.counts.completed}</dd></div>
          <div><dt className={colorStyles.text.muted}>Remaining</dt><dd>{formatRemainingEffort(metrics.estimatedRemainingMinutes, metrics.remainingEffort)}</dd></div>
          <div><dt className={colorStyles.text.muted}>Last activity</dt><dd><time dateTime={metrics.lastActivity.toISOString()}>{formatActivity(metrics.lastActivity)}</time></dd></div>
        </dl>
      </div>
    </Card>
  );
}

export { ProjectHero };
