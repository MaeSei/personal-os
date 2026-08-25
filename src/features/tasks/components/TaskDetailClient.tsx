"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageStatus } from "@/components/ui/PageStatus";
import { TaskDetail } from "@/features/tasks/components/TaskDetail";
import { useTaskDetail } from "@/features/tasks/hooks/useTaskDetail";
import { useFeatures } from "@/features/FeatureProvider";

type TaskDetailClientProps = { readonly taskId: string };

function TaskDetailClient({ taskId }: TaskDetailClientProps) {
  const router = useRouter();
  const { tasks } = useFeatures();
  const workspace = useTaskDetail(taskId, tasks);

  if (workspace.error && !workspace.data) {
    return <PageStatus action={<Button onClick={workspace.retry} variant="secondary">Try again</Button>} description={workspace.error} title="This Task is unavailable" tone="danger" />;
  }
  if (workspace.notFound) {
    return <PageStatus action={<ButtonLink href="/" variant="secondary">Workspace</ButtonLink>} description="It may have been removed or converted into a Project." title="Task not found" tone="danger" />;
  }
  if (workspace.isLoading || !workspace.data) {
    return <PageStatus description="Gathering its context, schedule, and history." title="Preparing the Task" />;
  }

  const data = workspace.data;
  return (
    <TaskDetail
      announcement={workspace.announcement}
      data={data}
      error={workspace.error}
      isSaving={workspace.isSaving}
      onConvert={async (outcome) => {
        const project = await workspace.convert(outcome);
        if (!project) return false;
        router.push(`/projects/${encodeURIComponent(project.id)}`);
        return true;
      }}
      onDelete={async () => {
        const deleted = await workspace.deleteTask();
        if (deleted === null) return false;
        router.push(data.project ? `/projects/${encodeURIComponent(data.project.id)}` : "/");
        return true;
      }}
      onDetach={async () => (await workspace.detach()) !== null}
      onDuplicate={async () => {
        const duplicate = await workspace.duplicate();
        if (!duplicate) return false;
        router.push(`/tasks/${encodeURIComponent(duplicate.id)}`);
        return true;
      }}
      onMove={async (input) => (await workspace.move(input)) !== null}
      onUpdate={async (input) => (await workspace.update(input)) !== null}
    />
  );
}

export { TaskDetailClient };
