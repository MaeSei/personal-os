"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { fieldClassName } from "@/components/forms/fieldStyles";
import type { ProjectMilestone, Task } from "@/domain";
import { Status, isTask } from "@/domain";
import { TaskMetadata } from "@/features/tasks/components/TaskMetadata";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskHierarchyProps = {
  readonly disabled: boolean;
  readonly onDelete: (taskId: string) => Promise<boolean>;
  readonly onEdit: (task: Task) => void;
  readonly onGroup: (taskId: string, milestoneId: string | null) => Promise<boolean>;
  readonly onReorder: (taskId: string, direction: "down" | "up") => Promise<boolean>;
  readonly groupId: string | null;
  readonly milestones: readonly ProjectMilestone[];
  readonly tasks: readonly Task[];
};

type TaskNodeProps = TaskHierarchyProps & {
  readonly canMoveDown: boolean;
  readonly canMoveUp: boolean;
  readonly isRoot: boolean;
  readonly task: Task;
};

function TaskNode(props: TaskNodeProps) {
  const { canMoveDown, canMoveUp, disabled, isRoot, onDelete, onEdit, onReorder, task } = props;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const children = task.children.filter(isTask);

  return (
    <li className={cn(!isRoot && "ml-card border-l border-border pl-card")}>
      <div className={cn("py-card first:pt-0", spacingStyles.detailStack)}>
        <div className="flex flex-col items-start justify-between gap-cluster sm:flex-row">
          <div className={spacingStyles.detailStack}>
            <div className={spacingStyles.cluster}>
              <h4 className={typographyStyles.itemTitle}>
                <a
                  className={colorStyles.focusRing}
                  href={`/tasks/${encodeURIComponent(task.id)}`}
                >
                  {task.title}
                </a>
              </h4>
              <TaskStatusBadge status={task.status} />
            </div>
            {task.description ? (
              <p className={cn(typographyStyles.description, colorStyles.text.muted)}>{task.description}</p>
            ) : null}
            <TaskMetadata task={task} />
          </div>
          <div className={spacingStyles.cluster}>
            {isRoot ? (
              <select
                aria-label={`Group ${task.title}`}
                className={cn(fieldClassName, "h-control-sm py-0 text-sm")}
                disabled={disabled}
                onChange={(event) => void props.onGroup(task.id, event.target.value || null)}
                value={props.groupId ?? ""}
              >
                <option value="">Ungrouped</option>
                {props.milestones
                  .filter((milestone) =>
                    milestone.status === Status.Active || milestone.id === props.groupId)
                  .map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                  ))}
              </select>
            ) : null}
            <Button aria-label={`Move ${task.title} up`} disabled={disabled || !canMoveUp} onClick={() => void onReorder(task.id, "up")} size="sm" variant="ghost">↑</Button>
            <Button aria-label={`Move ${task.title} down`} disabled={disabled || !canMoveDown} onClick={() => void onReorder(task.id, "down")} size="sm" variant="ghost">↓</Button>
            {[Status.Active, Status.Today].includes(task.status) ? (
              <ButtonLink href={`/planner?task=${encodeURIComponent(task.id)}#time-blocks`} size="sm" variant="secondary">Schedule</ButtonLink>
            ) : null}
            <Button disabled={disabled} onClick={() => onEdit(task)} size="sm" variant="secondary">Edit</Button>
            {confirmDelete ? (
              <>
                <Button disabled={disabled} onClick={() => void onDelete(task.id)} size="sm" variant="danger">Confirm</Button>
                <Button onClick={() => setConfirmDelete(false)} size="sm" variant="ghost">Keep</Button>
              </>
            ) : (
              <Button disabled={disabled} onClick={() => setConfirmDelete(true)} size="sm" variant="ghost">Delete</Button>
            )}
          </div>
        </div>
        {children.length > 0 ? (
          <ul className={spacingStyles.detailStack}>
            {children.map((child, index) => (
              <TaskNode {...props} canMoveDown={index < children.length - 1} canMoveUp={index > 0} isRoot={false} key={child.id} task={child} />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function TaskHierarchy({ tasks, ...props }: TaskHierarchyProps) {
  return (
    <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
      {tasks.map((task, index) => (
        <TaskNode {...props} canMoveDown={index < tasks.length - 1} canMoveUp={index > 0} isRoot key={task.id} task={task} tasks={tasks} />
      ))}
    </ul>
  );
}

export { TaskHierarchy };
