import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PlannerProject } from "@/features/contracts/PlannerFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspaceProjectsProps = {
  readonly isFiltering?: boolean;
  readonly projects: readonly PlannerProject[];
};

function WorkspaceProjects({
  isFiltering = false,
  projects,
}: WorkspaceProjectsProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        action={<ButtonLink href="/projects" size="sm" variant="secondary">Open Projects</ButtonLink>}
        description={isFiltering
          ? "Try a broader search or clear the query."
          : "Active Projects will stay visible here while you shape the day."}
        title={isFiltering ? "No matching Projects" : "No active Projects"}
      />
    );
  }

  return (
    <div className={spacingStyles.detailStack}>
      <ul className={cn("divide-y", colorStyles.itemList)}>
        {projects.map((project) => (
          <li className="py-card-compact first:pt-0 last:pb-0" key={project.id}>
            <a
              className={cn("block", spacingStyles.detailStack, colorStyles.focusRing)}
              href={`/projects/${project.id}`}
            >
              <span className={typographyStyles.metricLabel}>{project.title}</span>
              <span className={cn("block", typographyStyles.description, colorStyles.text.muted)}>
                {project.outcome}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <ButtonLink href="/projects" size="sm" variant="ghost">All Projects</ButtonLink>
    </div>
  );
}

export { WorkspaceProjects };
