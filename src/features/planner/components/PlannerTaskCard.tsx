"use client";

import { useId, useState, type DragEvent, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  PlannerAvailableSlot,
  PlannerTask,
} from "@/features/contracts/PlannerFeature";
import { formatClockTime, formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type PlannerTaskCardProps = {
  readonly disabled: boolean;
  readonly isScheduled?: boolean;
  readonly onAdd?: () => void;
  readonly onDropBefore?: (taskId: string) => void;
  readonly onMove?: (direction: "down" | "up") => void;
  readonly onRemove?: () => void;
  readonly onSelect?: (selected: boolean) => void;
  readonly onScheduleSuggested?: () => void;
  readonly onUnschedule?: () => void;
  readonly position?: { readonly current: number; readonly total: number };
  readonly reason?: string;
  readonly selected?: boolean;
  readonly suggestedPlacement?: PlannerAvailableSlot;
  readonly task: PlannerTask;
};

function PlannerTaskCard({
  disabled,
  isScheduled = false,
  onAdd,
  onDropBefore,
  onMove,
  onRemove,
  onSelect,
  onScheduleSuggested,
  onUnschedule,
  position,
  reason,
  selected = false,
  suggestedPlacement,
  task,
}: PlannerTaskCardProps) {
  const [dragging, setDragging] = useState(false);
  const instructionsId = useId();
  const metadata = [
    task.estimatedDuration ? formatDuration(task.estimatedDuration) : "No estimate",
    `Effort ${task.effort}/5`,
    `Energy ${task.energyCost}/5`,
    task.estimateConfidence ? `${task.estimateConfidence} confidence` : null,
    task.contexts.length > 0 ? task.contexts.join(", ") : null,
    task.preferredTime ? `Prefers ${task.preferredTime.toLowerCase()}` : null,
    task.dueDate ? `Due ${task.dueDate}` : null,
  ].filter(Boolean);

  function startDrag(event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-atlas-task-id", task.id);
    event.dataTransfer.setData("text/plain", task.id);
    setDragging(true);
  }

  function dropBefore(event: DragEvent<HTMLElement>) {
    if (!onDropBefore) return;
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== task.id) onDropBefore(draggedId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onMove || !event.altKey) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (
      (event.key === "ArrowUp" && position?.current === 1) ||
      (event.key === "ArrowDown" && position?.current === position?.total)
    ) return;
    event.preventDefault();
    onMove(event.key === "ArrowUp" ? "up" : "down");
  }

  return (
    <Card
      aria-describedby={instructionsId}
      as="article"
      className={cn(
        !disabled && "cursor-grab active:cursor-grabbing",
        motionStyles.dragItem,
        dragging && "opacity-60",
      )}
      draggable={!disabled}
      hoverable
      onDragEnd={() => setDragging(false)}
      onDragOver={onDropBefore ? (event) => event.preventDefault() : undefined}
      onDragStart={startDrag}
      onDrop={dropBefore}
      onKeyDown={handleKeyDown}
      padding="sm"
    >
      <div className={spacingStyles.detailStack}>
        <p className="sr-only" id={instructionsId}>
          {onMove
            ? "Drag to reorder, or use Alt plus the up and down arrow keys."
            : "Drag to add this Task to today or prepare a Time Block. The labeled buttons provide the same actions."}
        </p>
        <div className="flex items-start justify-between gap-cluster">
          <div className="flex min-w-0 items-start gap-cluster">
            {onSelect ? (
              <input
                aria-label={`Select ${task.title}`}
                checked={selected}
                className="mt-detail size-4 shrink-0 accent-accent"
                disabled={disabled}
                draggable={false}
                onChange={(event) => onSelect(event.target.checked)}
                onDragStart={(event) => event.stopPropagation()}
                type="checkbox"
              />
            ) : null}
            <div className="min-w-0">
              <h3 className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}>
                <a
                  className={colorStyles.focusRing}
                  draggable={false}
                  href={`/tasks/${encodeURIComponent(task.id)}`}
                  onDragStart={(event) => event.stopPropagation()}
                >
                  {task.title}
                </a>
              </h3>
              <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                {task.area.icon} {task.project?.title ?? task.area.title}
                {task.project ? ` · ${task.project.outcome}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-detail">
            {suggestedPlacement ? (
              <Badge variant="success">
                {formatClockTime(suggestedPlacement.start)}–{formatClockTime(suggestedPlacement.end)}
              </Badge>
            ) : null}
            {position ? <Badge variant="neutral">{position.current}/{position.total}</Badge> : null}
          </div>
        </div>
        <p className={cn(typographyStyles.metricValue, colorStyles.text.muted)}>{metadata.join(" · ")}</p>
        {reason ? <p className={cn(typographyStyles.description, colorStyles.text.accent)}>{reason}</p> : null}
        <div className={spacingStyles.cluster}>
          {onAdd ? <Button disabled={disabled} onClick={onAdd} size="sm">Add to today</Button> : null}
          {onScheduleSuggested && suggestedPlacement ? (
            <Button
              disabled={disabled}
              onClick={onScheduleSuggested}
              size="sm"
              variant="secondary"
            >
              Plan at {formatClockTime(suggestedPlacement.start)}
            </Button>
          ) : null}
          {onMove ? (
            <>
              <Button aria-keyshortcuts="Alt+ArrowUp" disabled={disabled || position?.current === 1} onClick={() => onMove("up")} size="sm" variant="ghost">Move up</Button>
              <Button aria-keyshortcuts="Alt+ArrowDown" disabled={disabled || position?.current === position?.total} onClick={() => onMove("down")} size="sm" variant="ghost">Move down</Button>
            </>
          ) : null}
          {isScheduled && onUnschedule ? <Button disabled={disabled} onClick={onUnschedule} size="sm" variant="secondary">Remove time</Button> : null}
          {onRemove ? <Button disabled={disabled} onClick={onRemove} size="sm" variant="ghost">Return to pool</Button> : null}
        </div>
      </div>
    </Card>
  );
}

export { PlannerTaskCard };
