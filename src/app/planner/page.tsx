import type { Metadata } from "next";

import { DailyPlannerClient } from "@/features/planner/components/DailyPlannerClient";

export const metadata: Metadata = {
  description: "Shape an intentional day around real calendar commitments.",
  title: "Calendar Workspace | Atlas",
};

type PlannerPageProps = {
  readonly searchParams: Promise<{ readonly task?: string }>;
};

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const { task } = await searchParams;
  return <DailyPlannerClient initialTaskId={task ?? null} />;
}
