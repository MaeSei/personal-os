"use client";

import { useRef, type FormEvent } from "react";

import { fieldClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import type {
  PlannerProject,
  PlannerTask,
  PlannerTimeBlock,
} from "@/features/contracts/PlannerFeature";
import { spacingStyles } from "@/theme/spacing";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { typographyStyles } from "@/theme/typography";

type TimeBlockLinksProps = {
  readonly block: PlannerTimeBlock;
  readonly disabled: boolean;
  readonly onLinkProject: (projectId: string) => void;
  readonly onLinkTask: (taskId: string) => void;
  readonly onUnlinkProject: (projectId: string) => Promise<boolean>;
  readonly onUnlinkTask: (taskId: string) => Promise<boolean>;
  readonly projects: readonly PlannerProject[];
  readonly tasks: readonly PlannerTask[];
};

function TimeBlockLinks(props: TimeBlockLinksProps) {
  const { block, disabled, projects, tasks } = props;
  const linkedTaskIds = new Set(block.linkedTasks.map(({ id }) => id));
  const linkedProjectIds = new Set(block.linkedProjects.map(({ id }) => id));
  const availableTasks = tasks.filter(({ id }) => !linkedTaskIds.has(id));
  const availableProjects = projects.filter(({ id }) => !linkedProjectIds.has(id));
  const summaryRef = useRef<HTMLElement>(null);

  function submitLink(
    event: FormEvent<HTMLFormElement>,
    field: string,
    onLink: (id: string) => void,
  ) {
    event.preventDefault();
    if (disabled) return;
    const id = String(new FormData(event.currentTarget).get(field) || "");
    if (id) onLink(id);
  }

  async function unlink(action: () => Promise<boolean>) {
    if (await action()) requestAnimationFrame(() => summaryRef.current?.focus());
  }

  return (
    <details>
      <summary
        aria-label={`Linked work for ${block.title}`}
        className={cn(
          "cursor-pointer",
          typographyStyles.metricLabel,
          colorStyles.text.muted,
          colorStyles.focusRing,
        )}
        ref={summaryRef}
      >
        Linked work ({block.linkedTasks.length + block.linkedProjects.length})
      </summary>
      <div className={cn("pt-card-compact", spacingStyles.cardStack)}>
        {block.linkedTasks.map((task) => (
          <div className="flex items-center justify-between gap-cluster" key={task.id}>
            <span className={typographyStyles.description}>Task · {task.title}</span>
            <Button disabled={disabled} onClick={() => void unlink(() => props.onUnlinkTask(task.id))} size="sm" variant="ghost">Unlink</Button>
          </div>
        ))}
        {block.linkedProjects.map((project) => (
          <div className="flex items-center justify-between gap-cluster" key={project.id}>
            <span className={typographyStyles.description}>Project · {project.title}</span>
            <Button disabled={disabled} onClick={() => void unlink(() => props.onUnlinkProject(project.id))} size="sm" variant="ghost">Unlink</Button>
          </div>
        ))}
        {availableTasks.length > 0 ? (
          <form className={spacingStyles.cluster} onSubmit={(event) => submitLink(event, "taskId", props.onLinkTask)}>
            <label className="sr-only" htmlFor={`block-${block.id}-link-task`}>Task to link</label>
            <select className={fieldClassName} id={`block-${block.id}-link-task`} name="taskId">
              {availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            <Button disabled={disabled} size="sm" type="submit" variant="secondary">Link Task</Button>
          </form>
        ) : null}
        {availableProjects.length > 0 ? (
          <form className={spacingStyles.cluster} onSubmit={(event) => submitLink(event, "projectId", props.onLinkProject)}>
            <label className="sr-only" htmlFor={`block-${block.id}-link-project`}>Project to link</label>
            <select className={fieldClassName} id={`block-${block.id}-link-project`} name="projectId">
              {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
            <Button disabled={disabled} size="sm" type="submit" variant="secondary">Link Project</Button>
          </form>
        ) : null}
      </div>
    </details>
  );
}

export { TimeBlockLinks };
