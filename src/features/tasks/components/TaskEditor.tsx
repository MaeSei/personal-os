"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import type {
  Area,
  Effort,
  EnergyCost,
  EstimateConfidence,
  Project,
  TaskStatus,
} from "@/domain";
import { TaskCoreFields } from "@/features/tasks/components/TaskCoreFields";
import { TaskPlanningFields } from "@/features/tasks/components/TaskPlanningFields";
import type { TaskEditorValue } from "@/features/tasks/components/types";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type TaskEditorProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly idPrefix: string;
  readonly initialValue: TaskEditorValue;
  readonly onCancel: () => void;
  readonly onSubmit: (value: TaskEditorValue) => Promise<boolean>;
  readonly projects: readonly Project[];
  readonly showStatus?: boolean;
  readonly submitLabel: string;
};

function readOptional(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? "").trim();
  return value || null;
}

function TaskEditor({
  areas,
  disabled,
  idPrefix,
  initialValue,
  onCancel,
  onSubmit,
  projects,
  showStatus = true,
  submitLabel,
}: TaskEditorProps) {
  const [areaId, setAreaId] = useState(initialValue.areaId);
  const [projectId, setProjectId] = useState(initialValue.projectId ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const duration = readOptional(form, "duration");
    const contexts = [
      ...form.getAll("contexts").map(String),
      ...String(form.get("customContexts") ?? "").split(","),
    ];

    await onSubmit({
      areaId,
      context: null,
      contexts,
      description: readOptional(form, "description"),
      dueDate: readOptional(form, "dueDate"),
      durationMinutes: duration ? Number(duration) : null,
      effort: Number(form.get("effort")) as Effort,
      estimateConfidence: readOptional(
        form,
        "estimateConfidence",
      ) as EstimateConfidence | null,
      estimatedDuration: duration ? Number(duration) : null,
      energyCost: Number(form.get("energy")) as EnergyCost,
      projectId: projectId || null,
      preferredContext: null,
      preferredTime: readOptional(form, "preferredTime") as TaskEditorValue["preferredTime"],
      scheduledDate: initialValue.scheduledStart
        ? initialValue.scheduledDate
        : readOptional(form, "scheduledDate"),
      status: showStatus
        ? (String(form.get("status")) as TaskStatus)
        : initialValue.status,
      title: String(form.get("title") ?? ""),
    });
  }

  function handleAreaChange(nextAreaId: string) {
    setAreaId(nextAreaId);
    if (
      projectId &&
      !projects.some(
        (project) => project.id === projectId && project.areaId === nextAreaId,
      )
    ) {
      setProjectId("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form
      aria-busy={disabled}
      className={cn("@container", spacingStyles.cardStack)}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
    >
      <TaskCoreFields
        areaId={areaId}
        areas={areas}
        idPrefix={idPrefix}
        initialValue={initialValue}
        onAreaChange={handleAreaChange}
        onProjectChange={setProjectId}
        projectId={projectId}
        projects={projects}
        showStatus={showStatus}
      />
      <TaskPlanningFields idPrefix={idPrefix} initialValue={initialValue} />
      <div className={spacingStyles.cluster}>
        <Button disabled={disabled || !areaId} type="submit">
          {disabled ? "Saving…" : submitLabel}
        </Button>
        <Button disabled={disabled} onClick={onCancel} variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export { TaskEditor, type TaskEditorProps };
