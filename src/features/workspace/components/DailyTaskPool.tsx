"use client";

import { useState, type DragEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WorkspaceTask } from "@/features/contracts/WorkspaceFeature";
import { TaskMetadata } from "@/features/tasks/components/TaskMetadata";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type DailyTaskPoolProps = {
  readonly activeFilterCount: number;
  readonly disabled: boolean;
  readonly onAdd: (taskId: string) => void;
  readonly pendingTaskId: string | null;
  readonly tasks: readonly WorkspaceTask[];
};

function PoolTask({
  disabled,
  onAdd,
  pending,
  value,
}: Omit<DailyTaskPoolProps, "activeFilterCount" | "pendingTaskId" | "tasks"> & {
  readonly pending: boolean;
  readonly value: WorkspaceTask;
}) {
  const [dragging, setDragging] = useState(false);

  function startDrag(event: DragEvent<HTMLElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-atlas-task-id", value.task.id);
    event.dataTransfer.setData("text/plain", value.task.id);
    setDragging(true);
  }

  return (
    <Card
      as="article"
      aria-busy={pending}
      className={cn("cursor-grab active:cursor-grabbing", motionStyles.dragItem, dragging && "opacity-60")}
      draggable={!disabled}
      hoverable
      onDragEnd={() => setDragging(false)}
      onDragStart={startDrag}
      padding="sm"
    >
      <div className={spacingStyles.detailStack}>
        <div>
          <h4 className={typographyStyles.cardTitle}>
            <a className={colorStyles.focusRing} draggable={false} href={`/tasks/${encodeURIComponent(value.task.id)}`}>{value.task.title}</a>
          </h4>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            {value.project?.title ?? value.area?.title ?? "Standalone Task"}
          </p>
        </div>
        <TaskMetadata task={value.task} />
        <Button className="w-full sm:w-auto" disabled={disabled} onClick={() => onAdd(value.task.id)} size="sm">
          {pending ? "Adding…" : "Add to today"}
        </Button>
      </div>
    </Card>
  );
}

function DailyTaskPool({
  activeFilterCount,
  disabled,
  onAdd,
  pendingTaskId,
  tasks,
}: DailyTaskPoolProps) {
  return (
    <details
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.currentTarget.removeAttribute("open");
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-cluster [&::-webkit-details-marker]:hidden",
          typographyStyles.cardTitle,
          colorStyles.text.primary,
          colorStyles.focusRing,
        )}
      >
        <span>Available Tasks</span>
        <Badge variant="neutral">{tasks.length}</Badge>
      </summary>
      <div className={cn("pt-card", spacingStyles.cardStack)}>
        {tasks.length === 0 ? (
          <EmptyState
            description={
              activeFilterCount > 0
                ? "Adjust or clear the filters to widen the available pool."
                : "Everything available is already close today, or there is no actionable work yet."
            }
            title={activeFilterCount > 0 ? "No Tasks match these filters" : "No available Tasks"}
          />
        ) : tasks.map((value) => (
          <PoolTask
            disabled={disabled}
            key={value.task.id}
            onAdd={onAdd}
            pending={pendingTaskId === value.task.id}
            value={value}
          />
        ))}
      </div>
    </details>
  );
}

export { DailyTaskPool };
export type { DailyTaskPoolProps };
