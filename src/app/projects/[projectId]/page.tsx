import type { Metadata } from "next";

import { ProjectDetailClient } from "@/features/projects/components/ProjectDetailClient";

export const metadata: Metadata = {
  description: "Work with an Atlas Project outcome and its Tasks.",
  title: "Project Workspace | Atlas",
};

type ProjectPageProps = {
  readonly params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <ProjectDetailClient projectId={decodeURIComponent(projectId)} />;
}
