import type { Metadata } from "next";

import { ProjectOverviewClient } from "@/features/projects/components/ProjectOverviewClient";

export const metadata: Metadata = {
  description: "Review active Atlas Projects and the work around each outcome.",
  title: "Projects | Atlas",
};

export default function ProjectsPage() {
  return <ProjectOverviewClient />;
}
