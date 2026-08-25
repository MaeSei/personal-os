"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClassName, fieldGroupClassName, labelClassName } from "@/components/forms/fieldStyles";
import type { Area, Project, Task } from "@/domain";
import type { TaskAssignmentInput } from "@/features/contracts/TaskFeature";
import { spacingStyles } from "@/theme/spacing";

type TaskMoveFormProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (input: TaskAssignmentInput) => Promise<boolean>;
  readonly projects: readonly Project[];
  readonly task: Task;
};

function TaskMoveForm(props: TaskMoveFormProps) {
  const [areaId, setAreaId] = useState(props.task.areaId);
  const [projectId, setProjectId] = useState(props.task.projectId ?? "");
  const availableProjects = props.projects.filter((project) => project.areaId === areaId);

  function changeArea(nextAreaId: string) {
    setAreaId(nextAreaId);
    if (!props.projects.some((project) => project.id === projectId && project.areaId === nextAreaId)) {
      setProjectId("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await props.onSubmit({ areaId, projectId: projectId || null })) props.onCancel();
  }

  return (
    <Card as="article" padding="lg" tone="subtle">
      <form className={spacingStyles.cardStack} onSubmit={submit}>
        <h3 className="text-heading font-semibold">Move Task</h3>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor="task-move-area">Area</label>
          <select className={fieldClassName} id="task-move-area" onChange={(event) => changeArea(event.target.value)} required value={areaId}>
            {props.areas.map((area) => <option key={area.id} value={area.id}>{area.icon} {area.title}</option>)}
          </select>
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor="task-move-project">Project <span className="font-normal">(optional)</span></label>
          <select className={fieldClassName} id="task-move-project" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
            <option value="">No Project</option>
            {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </div>
        <div className={spacingStyles.cluster}>
          <Button disabled={props.disabled || !areaId} type="submit">{props.disabled ? "Moving…" : "Move"}</Button>
          <Button disabled={props.disabled} onClick={props.onCancel} variant="ghost">Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export { TaskMoveForm };
