"use client";

import type { FormEvent } from "react";

import {
  fieldClassName,
  fieldGroupClassName,
  formGridClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { timeBlockTypes, type TimeBlockType } from "@/domain";
import type {
  PlannerProject,
  PlannerTask,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";
import { parseClockTime } from "@/features/planner/presentation";
import { spacingStyles } from "@/theme/spacing";

type TimeBlockFormProps = {
  readonly disabled: boolean;
  readonly initialTaskId?: string | null;
  readonly onSubmit: (input: TimeBlockWriteInput) => Promise<boolean>;
  readonly projects: readonly PlannerProject[];
  readonly tasks: readonly PlannerTask[];
};

function TimeBlockForm({
  disabled,
  initialTaskId,
  onSubmit,
  projects,
  tasks,
}: TimeBlockFormProps) {
  const initialTask = tasks.find(({ id }) => id === initialTaskId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const taskId = String(form.get("taskId") || "");
    const projectId = String(form.get("projectId") || "");
    const saved = await onSubmit({
      end: parseClockTime(String(form.get("end"))),
      linkedProjectIds: projectId ? [projectId] : [],
      linkedTaskIds: taskId ? [taskId] : [],
      locked: form.get("locked") === "on",
      notes: String(form.get("notes") || "") || null,
      start: parseClockTime(String(form.get("start"))),
      title: String(form.get("title") || ""),
      type: String(form.get("type")) as TimeBlockType,
    });
    if (saved) element.reset();
  }

  return (
    <Card tone="subtle">
      <form className={spacingStyles.cardStack} onSubmit={submit}>
        <div className={formGridClassName}>
          <div className={fieldGroupClassName}>
            <label className={labelClassName} htmlFor="time-block-title">Name</label>
            <input
              autoFocus
              className={fieldClassName}
              defaultValue={initialTask?.title ?? ""}
              id="time-block-title"
              name="title"
              placeholder="Protected focus"
              required
            />
          </div>
          <div className={fieldGroupClassName}>
            <label className={labelClassName} htmlFor="time-block-type">Type</label>
            <select className={fieldClassName} defaultValue="Focus" id="time-block-type" name="type">
              {timeBlockTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div className={fieldGroupClassName}>
            <label className={labelClassName} htmlFor="time-block-start">Start</label>
            <input className={fieldClassName} defaultValue="09:00" id="time-block-start" name="start" required type="time" />
          </div>
          <div className={fieldGroupClassName}>
            <label className={labelClassName} htmlFor="time-block-end">End</label>
            <input className={fieldClassName} defaultValue="09:30" id="time-block-end" name="end" required type="time" />
          </div>
          <div className={fieldGroupClassName}>
            <label className={labelClassName} htmlFor="time-block-task">Task (optional)</label>
            <select className={fieldClassName} defaultValue={initialTaskId ?? ""} id="time-block-task" name="taskId">
              <option value="">No linked Task</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </div>
          <div className={fieldGroupClassName}>
            <label className={labelClassName} htmlFor="time-block-project">Project (optional)</label>
            <select className={fieldClassName} id="time-block-project" name="projectId">
              <option value="">No linked Project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor="time-block-notes">Notes (optional)</label>
          <textarea className={fieldClassName} id="time-block-notes" name="notes" rows={2} />
        </div>
        <label className="flex items-center gap-cluster text-sm text-ink-muted">
          <input className="size-4 accent-accent" name="locked" type="checkbox" />
          Lock this reservation after creation
        </label>
        <Button disabled={disabled} type="submit">{disabled ? "Saving…" : "Create Time Block"}</Button>
      </form>
    </Card>
  );
}

export { TimeBlockForm };
