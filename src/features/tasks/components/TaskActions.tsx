"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { Area, Project, Task } from "@/domain";
import type { TaskAssignmentInput, TaskWriteInput } from "@/features/contracts/TaskFeature";
import { TaskConvertForm } from "@/features/tasks/components/TaskConvertForm";
import { TaskEditor } from "@/features/tasks/components/TaskEditor";
import { TaskMoveForm } from "@/features/tasks/components/TaskMoveForm";
import { taskToEditorValue } from "@/features/tasks/components/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ActionMode = "convert" | "delete" | "edit" | "idle" | "move";
type TaskActionsProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly onConvert: (outcome: string) => Promise<boolean>;
  readonly onDelete: () => Promise<boolean>;
  readonly onDetach: () => Promise<boolean>;
  readonly onDuplicate: () => Promise<boolean>;
  readonly onMove: (input: TaskAssignmentInput) => Promise<boolean>;
  readonly onUpdate: (input: TaskWriteInput) => Promise<boolean>;
  readonly projects: readonly Project[];
  readonly task: Task;
};

function TaskActions(props: TaskActionsProps) {
  const [mode, setMode] = useState<ActionMode>("idle");
  const close = () => setMode("idle");
  const action = mode === "edit" ? (
    <Card padding="lg" tone="subtle">
      <TaskEditor
        areas={props.areas}
        disabled={props.disabled}
        idPrefix="task-detail-edit"
        initialValue={taskToEditorValue(props.task)}
        onCancel={close}
        onSubmit={async (input) => {
          const saved = await props.onUpdate(input);
          if (saved) close();
          return saved;
        }}
        projects={props.projects}
        submitLabel="Save Task"
      />
    </Card>
  ) : mode === "move" ? (
    <TaskMoveForm
      areas={props.areas}
      disabled={props.disabled}
      onCancel={close}
      onSubmit={props.onMove}
      projects={props.projects}
      task={props.task}
    />
  ) : mode === "convert" ? (
    <TaskConvertForm
      disabled={props.disabled}
      onCancel={close}
      onSubmit={props.onConvert}
    />
  ) : mode === "delete" ? (
    <Card padding="lg" tone="danger">
      <div className={spacingStyles.cardStack}>
        <div className={spacingStyles.detailStack}>
          <h3 className={typographyStyles.cardTitle}>Delete this Task?</h3>
          <p className={cn(typographyStyles.description, colorStyles.text.danger)}>
            This removes the Task and any nested work. This action cannot be undone.
          </p>
        </div>
        <div className={spacingStyles.cluster}>
          <Button disabled={props.disabled} onClick={() => void props.onDelete()} variant="danger">
            {props.disabled ? "Deleting…" : "Delete permanently"}
          </Button>
          <Button disabled={props.disabled} onClick={close} variant="ghost">Keep Task</Button>
        </div>
      </div>
    </Card>
  ) : null;

  return (
    <Section description="Make an explicit change to this Task." id="task-actions" title="Actions">
      <div className={spacingStyles.cluster}>
        <Button disabled={props.disabled} onClick={() => setMode("edit")} variant="secondary">Edit</Button>
        <Button disabled={props.disabled} onClick={() => setMode("move")} variant="secondary">Move</Button>
        <Button disabled={props.disabled} onClick={() => void props.onDuplicate()} variant="secondary">Duplicate</Button>
        {props.task.projectId ? (
          <Button disabled={props.disabled} onClick={() => void props.onDetach()} variant="ghost">
            Detach from Project
          </Button>
        ) : null}
        <Button disabled={props.disabled} onClick={() => setMode("convert")} variant="ghost">Convert to Project</Button>
        <Button disabled={props.disabled} onClick={() => setMode("delete")} variant="ghost">Delete</Button>
      </div>
      {action}
    </Section>
  );
}

export { TaskActions };
