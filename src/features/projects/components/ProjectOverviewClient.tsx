"use client";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import { ProjectOverview } from "@/features/projects/components/ProjectOverview";
import { useProjectOverview } from "@/features/projects/hooks/useProjectOverview";
import { useFeatures } from "@/features/FeatureProvider";

function ProjectOverviewClient() {
  const { projects } = useFeatures();
  const { data, error, filters, retry, setFilters } =
    useProjectOverview(projects);

  if (error) {
    return (
      <PageStatus
        action={<Button onClick={retry} variant="secondary">Try again</Button>}
        description={error}
        title="Projects are unavailable"
        tone="danger"
      />
    );
  }

  if (!data) {
    return (
      <PageStatus
        description="Calculating progress and gathering Project activity."
        title="Preparing your Projects"
      />
    );
  }

  return (
    <ProjectOverview
      {...data}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}

export { ProjectOverviewClient };
