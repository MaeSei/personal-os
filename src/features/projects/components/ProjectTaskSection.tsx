"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { Status, type Area, type Project, type Task } from "@/domain";
import type { TaskWriteInput } from "@/features/contracts/ProjectFeature";
import { BreakdownPanel } from "@/features/projects/components/BreakdownPanel";
import { TaskHierarchy } from "@/features/projects/components/TaskHierarchy";
import { TaskEditor } from "@/features/tasks/components/TaskEditor";
import { taskToEditorValue, type TaskEditorValue } from "@/features/tasks/components/types";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectTaskSectionProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly error: string | null;
  readonly onBreakDown: (titles: readonly string[]) => Promise<boolean>;
  readonly onCreate: (input: TaskWriteInput) => Promise<boolean>;
  readonly onDelete: (taskId: string) => Promise<boolean>;
  readonly onReorder: (taskId: string, direction: "down" | "up") => Promise<boolean>;
  readonly onUpdate: (taskId: string, input: TaskWriteInput) => Promise<boolean>;
  readonly project: Project;
  readonly projects: readonly Project[];
  readonly tasks: readonly Task[];
};

function ProjectTaskSection(props: ProjectTaskSectionProps) {
  const [mode, setMode] = useState<"breakdown" | "create" | "idle">("idle");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const emptyValue: TaskEditorValue = {
    areaId: props.project.areaId,
    context: null,
    description: null,
    dueDate: null,
    durationMinutes: null,
    estimatedDuration: null,
    energyCost: 3,
    projectId: props.project.id,
    preferredContext: null,
    preferredTime: null,
    scheduledDate: null,
    scheduledEnd: null,
    scheduledStart: null,
    status: Status.Active,
    title: "",
  };

  async function saveCreate(value: TaskEditorValue) {
    const saved = await props.onCreate(value);
    if (saved) setMode("idle");
    return saved;
  }

  async function saveEdit(value: TaskEditorValue) {
    if (!editingTask) return false;
    const saved = await props.onUpdate(editingTask.id, value);
    if (saved) setEditingTask(null);
    return saved;
  }

  return (
    <Section
      action={
        <div className={spacingStyles.cluster}>
          <Button disabled={props.disabled} onClick={() => { setEditingTask(null); setMode("create"); }} size="sm">Create Task</Button>
          <Button disabled={props.disabled} onClick={() => { setEditingTask(null); setMode("breakdown"); }} size="sm" variant="secondary">Break this Project down</Button>
        </div>
      }
      description="Ordered concrete work. The first actionable Task becomes the next action."
      id="project-tasks"
      title="Task hierarchy"
    >
      {props.error ? <p className={cn(typographyStyles.description, "text-danger")} role="alert">{props.error}</p> : null}
      {mode === "create" ? (
        <Card tone="subtle">
          <TaskEditor areas={props.areas} disabled={props.disabled} idPrefix="project-task-create" initialValue={emptyValue} onCancel={() => setMode("idle")} onSubmit={saveCreate} projects={props.projects} submitLabel="Create Task" />
        </Card>
      ) : null}
      {editingTask ? (
        <Card tone="subtle">
          <TaskEditor areas={props.areas} disabled={props.disabled} idPrefix={`task-${editingTask.id}`} initialValue={taskToEditorValue(editingTask, props.project.id)} onCancel={() => setEditingTask(null)} onSubmit={saveEdit} projects={props.projects} submitLabel="Save Task" />
        </Card>
      ) : null}
      {mode === "breakdown" ? (
        <BreakdownPanel disabled={props.disabled} onCancel={() => setMode("idle")} onSubmit={async (titles) => {
          const saved = await props.onBreakDown(titles);
          if (saved) setMode("idle");
          return saved;
        }} />
      ) : null}
      {props.tasks.length === 0 ? (
        <EmptyState description="Create one concrete Task, or rapidly add several steps." title="No Tasks in this Project" />
      ) : (
        <TaskHierarchy disabled={props.disabled} onDelete={props.onDelete} onEdit={(task) => { setMode("idle"); setEditingTask(task); }} onReorder={props.onReorder} tasks={props.tasks} />
      )}
    </Section>
  );
}

export { ProjectTaskSection };
