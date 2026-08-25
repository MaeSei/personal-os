import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { WorkspaceProjectGroup } from "@/features/contracts/WorkspaceFeature";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";

type ProjectRailProps = {
  readonly error: string | null;
  readonly groups: readonly WorkspaceProjectGroup[];
  readonly isLoading: boolean;
  readonly onRetry: () => void;
};

function ProjectRail({ error, groups, isLoading, onRetry }: ProjectRailProps) {
  const count = groups.reduce(
    (total, group) => total + group.projects.length,
    0,
  );

  return (
    <aside aria-label="Current Projects">
      <Section
        action={
          <ButtonLink href="/projects" size="sm" variant="ghost">
            All Projects
          </ButtonLink>
        }
        description={
          isLoading
            ? "Gathering active outcomes by Area."
            : `${count} current ${count === 1 ? "outcome" : "outcomes"}, grouped by Area.`
        }
        id="workspace-projects"
        title="Projects"
      >
        {error ? (
          <EmptyState
            action={
              <Button onClick={onRetry} size="sm" variant="secondary">
                Try again
              </Button>
            }
            description="Your saved Projects have not changed."
            status="alert"
            title={error}
          />
        ) : isLoading ? (
          <EmptyState
            description="Gathering active outcomes and their current progress."
            status="status"
            title="Preparing Projects"
          />
        ) : groups.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/projects" size="sm" variant="secondary">
                Open Projects
              </ButtonLink>
            }
            description="Create an outcome when something needs more than one action."
            title="No active Projects"
          />
        ) : (
          <div className={spacingStyles.cardStack}>
            {groups.map(({ area, projects }) => (
              <CollapsiblePanel
                count={projects.length}
                headingLevel="h3"
                key={area.id}
                title={`${area.icon} ${area.title}`}
              >
                <ul className={cn("divide-y", colorStyles.itemList)}>
                  {projects.map((overview) => (
                    <ProjectCard
                      key={overview.project.id}
                      overview={overview}
                      variant="compact"
                    />
                  ))}
                </ul>
              </CollapsiblePanel>
            ))}
          </div>
        )}
      </Section>
    </aside>
  );
}

export { ProjectRail, type ProjectRailProps };
