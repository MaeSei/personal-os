"use client";

import { Badge } from "@/components/ui/Badge";
import type { WorkspaceTask } from "@/features/contracts/WorkspaceFeature";
import { TaskDropZone } from "@/features/planner/components/TaskDropZone";
import { DailyTaskCard } from "@/features/workspace/components/DailyTaskCard";
import { getDailyMoveTarget } from "@/features/workspace/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type PlaceTask = (
  taskId: string,
  beforeTaskId?: string | null,
  group?: string | null,
  pinned?: boolean,
) => void;

type DailyTaskGroupProps = {
  readonly disabled: boolean;
  readonly group: string | null;
  readonly groupNames: readonly string[];
  readonly onArchive: (taskId: string) => void;
  readonly onFocus: (taskId: string) => void;
  readonly onGroup: (taskId: string, group: string | null) => void;
  readonly onPin: (taskId: string, pinned: boolean) => void;
  readonly onPlace: PlaceTask;
  readonly onRemove: (taskId: string) => void;
  readonly pendingTaskId: string | null;
  readonly pinned?: boolean;
  readonly tasks: readonly WorkspaceTask[];
  readonly title: string;
};

function DailyTaskGroup(props: DailyTaskGroupProps) {
  const { tasks } = props;

  function move(taskId: string, direction: "down" | "up") {
    const target = getDailyMoveTarget(tasks, taskId, direction);
    if (target) {
      props.onPlace(taskId, target.beforeTaskId, undefined, props.pinned);
    }
  }

  return (
    <section className={spacingStyles.detailStack}>
      <header className="flex items-center justify-between gap-cluster">
        <h3 className={typographyStyles.cardTitle}>{props.title}</h3>
        <Badge variant="neutral">
          {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
        </Badge>
      </header>
      <TaskDropZone
        className={cn("min-h-28 p-card-compact", spacingStyles.cardStack)}
        disabled={props.disabled}
        label={`${props.title}. Drop a Task to place it at the end.`}
        onDropTask={(taskId) =>
          props.onPlace(
            taskId,
            null,
            props.pinned ? undefined : props.group,
            props.pinned ?? false,
          )
        }
      >
        {tasks.length === 0 ? (
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Drag a Task here with a pointer, or use Add to today below.
          </p>
        ) : tasks.map((value, index) => (
          <DailyTaskCard
            disabled={props.disabled}
            groupNames={props.groupNames}
            key={value.task.id}
            onArchive={() => props.onArchive(value.task.id)}
            onDropBefore={(taskId) =>
              props.onPlace(
                taskId,
                value.task.id,
                props.pinned ? undefined : props.group,
                props.pinned ?? false,
              )
            }
            onFocus={() => props.onFocus(value.task.id)}
            onGroup={(group) => props.onGroup(value.task.id, group)}
            onMove={(direction) => move(value.task.id, direction)}
            onPin={(pinned) => props.onPin(value.task.id, pinned)}
            onRemove={() => props.onRemove(value.task.id)}
            pending={props.pendingTaskId === value.task.id}
            position={{ current: index + 1, total: tasks.length }}
            value={value}
          />
        ))}
      </TaskDropZone>
    </section>
  );
}

export { DailyTaskGroup };
export type { DailyTaskGroupProps, PlaceTask };
