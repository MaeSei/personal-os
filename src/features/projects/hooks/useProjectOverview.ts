"use client";

import { useEffect, useState } from "react";

import type {
  ProjectOverviewData,
  ProjectFeature,
} from "@/features/contracts/ProjectFeature";
import { Status, type ProjectFilters } from "@/domain";

const initialFilters: ProjectFilters = {
  areaId: "all",
  search: "",
  sort: "activity",
  status: Status.Active,
};

function useProjectOverview(projects: ProjectFeature) {
  const [data, setData] = useState<ProjectOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isActive = true;

    projects
      .loadOverview(filters)
      .then((result) => {
        if (isActive) setData(result);
      })
      .catch(() => {
        if (isActive) setError("Atlas could not load your Projects.");
      });

    return () => {
      isActive = false;
    };
  }, [filters, projects, requestId]);

  return {
    data,
    error,
    filters,
    retry: () => {
      setError(null);
      setRequestId((current) => current + 1);
    },
    setFilters,
  };
}

export { useProjectOverview };
