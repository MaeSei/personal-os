import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import type { ProjectFilters as Filters } from "@/domain";
import type { ProjectOverviewData } from "@/features/contracts/ProjectFeature";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectFilters } from "@/features/projects/components/ProjectFilters";
import { spacingStyles } from "@/theme/spacing";

type ProjectOverviewProps = ProjectOverviewData & {
  readonly filters: Filters;
  readonly onFiltersChange: (filters: Filters) => void;
};

function ProjectOverview({
  areas,
  filters,
  onFiltersChange,
  projects,
}: ProjectOverviewProps) {
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={<ButtonLink href="/" variant="secondary">Mission Control</ButtonLink>}
          description="Outcomes, progress, and the work that moves them forward."
          eyebrow="Projects"
          title="Keep larger work visible."
        />
        <Section
          description="Active Projects appear by default. Search or widen the filters when you need another view."
          id="project-overview"
          title="Project overview"
        >
          <ProjectFilters
            areas={areas}
            filters={filters}
            onChange={onFiltersChange}
          />
          {projects.length === 0 ? (
            <EmptyState
              description="Try another Area, status, or search phrase."
              title="No Projects match this view"
            />
          ) : (
            <ul className={spacingStyles.cardGrid}>
              {projects.map((overview) => (
                <ProjectCard key={overview.project.id} overview={overview} />
              ))}
            </ul>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}

export { ProjectOverview };
