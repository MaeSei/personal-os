import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ProjectOverview } from "@/domain";
import { ProjectStatusBadge } from "@/features/projects/components/ProjectStatusBadge";
import {
  formatActivity,
  formatCalendarDate,
  formatRemainingEffort,
} from "@/features/projects/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectCardProps = { readonly overview: ProjectOverview };

function ProjectCard({ overview: { area, metrics, project } }: ProjectCardProps) {
  const counts = [
    ["Open", metrics.counts.open],
    ["Done", metrics.counts.completed],
    ["Waiting", metrics.counts.waiting],
    ["Blocked", metrics.counts.blocked],
  ] as const;

  return (
    <li>
      <a className={cn("block", colorStyles.focusRing)} href={`/projects/${project.id}`}>
        <Card as="article" hoverable padding="lg">
          <div className={spacingStyles.cardStack}>
            <header className={spacingStyles.detailStack}>
              <div className="flex items-start justify-between gap-cluster">
                <h2 className={typographyStyles.itemTitle}>{project.title}</h2>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                {project.outcome}
              </p>
              <Badge variant="neutral">
                <span aria-hidden="true">{area?.icon ?? "○"}</span>&nbsp;
                {area?.title ?? "Unknown Area"}
              </Badge>
            </header>
            <div>
              <div className="flex items-center justify-between gap-cluster">
                <span className={typographyStyles.metricLabel}>Progress</span>
                <span className={typographyStyles.metricValue}>{metrics.progress}%</span>
              </div>
              <progress className="mt-detail h-2 w-full accent-accent" max={100} value={metrics.progress}>
                {metrics.progress}%
              </progress>
            </div>
            <dl className="grid grid-cols-2 gap-card-compact sm:grid-cols-4">
              {counts.map(([label, value]) => (
                <div key={label}>
                  <dt className={cn(typographyStyles.label, colorStyles.text.muted)}>{label}</dt>
                  <dd className={typographyStyles.cardTitle}>{value}</dd>
                </div>
              ))}
            </dl>
            <dl className={spacingStyles.detailStack}>
              <div className="flex justify-between gap-cluster">
                <dt className={colorStyles.text.muted}>Scheduled work</dt>
                <dd>{metrics.scheduledWork.count}{metrics.scheduledWork.nextDate ? ` · ${formatCalendarDate(metrics.scheduledWork.nextDate)}` : ""}</dd>
              </div>
              <div className="flex justify-between gap-cluster">
                <dt className={colorStyles.text.muted}>Remaining effort</dt>
                <dd>{formatRemainingEffort(metrics.estimatedRemainingMinutes, metrics.remainingEffort)}</dd>
              </div>
              <div className="flex justify-between gap-cluster">
                <dt className={colorStyles.text.muted}>Last activity</dt>
                <dd><time dateTime={metrics.lastActivity.toISOString()}>{formatActivity(metrics.lastActivity)}</time></dd>
              </div>
            </dl>
          </div>
        </Card>
      </a>
    </li>
  );
}

export { ProjectCard };
