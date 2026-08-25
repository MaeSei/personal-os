import type { Metadata } from "next";

import { TaskDetailClient } from "@/features/tasks/components/TaskDetailClient";

export const metadata: Metadata = {
  description: "Understand and shape one Atlas Task.",
  title: "Task Workspace | Atlas",
};

type TaskPageProps = {
  readonly params: Promise<{ taskId: string }>;
};

export default async function TaskPage({ params }: TaskPageProps) {
  const { taskId } = await params;
  return <TaskDetailClient taskId={decodeURIComponent(taskId)} />;
}
