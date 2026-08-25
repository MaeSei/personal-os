"use client";

import { useId, useState, type DragEvent, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import type { WorkspaceTask } from "@/features/contracts/WorkspaceFeature";
import { TaskMetadata } from "@/features/tasks/components/TaskMetadata";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge";
import { DailyTaskGroupForm } from "@/features/workspace/components/DailyTaskGroupForm";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type DailyTaskCardProps = {
  readonly disabled: boolean;
  readonly groupNames: readonly string[];
  readonly onArchive: () => void;
  readonly onDropBefore: (taskId: string) => void;
  readonly onFocus: () => void;
  readonly onGroup: (group: string | null) => void;
  readonly onMove: (direction: "down" | "up") => void;
  readonly onPin: (pinned: boolean) => void;
  readonly onRemove: () => void;
  readonly pending: boolean;
  readonly position: { readonly current: number; readonly total: number };
  readonly value: WorkspaceTask;
};

function DailyTaskCard(props: DailyTaskCardProps) {
  const { daily, project, task } = props.value;
  const [dragging, setDragging] = useState(false);
  const instructionsId = useId();
  const titleId = useId();

  function startDrag(event: DragEvent<HTMLElement>) {
    if (props.disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-atlas-task-id", task.id);
    event.dataTransfer.setData("text/plain", task.id);
    setDragging(true);
  }

  function dropBefore(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (props.disabled) return;
    const draggedId = event.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== task.id) props.onDropBefore(draggedId);
  }

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      props.disabled ||
      !event.altKey ||
      !["ArrowDown", "ArrowUp"].includes(event.key)
    ) return;
    const direction = event.key === "ArrowUp" ? "up" : "down";
    if (
      (direction === "up" && props.position.current === 1) ||
      (direction === "down" && props.position.current === props.position.total)
    ) return;
    event.preventDefault();
    props.onMove(direction);
  }

  return (
    <Card
      aria-describedby={instructionsId}
      aria-labelledby={titleId}
      aria-busy={props.pending}
      as="article"
      className={cn("cursor-grab active:cursor-grabbing", motionStyles.dragItem, dragging && "opacity-60")}
      draggable={!props.disabled}
      hoverable
      onDragEnd={() => setDragging(false)}
      onDragOver={(event) => {
        if (!props.disabled) event.preventDefault();
      }}
      onDragStart={startDrag}
      onDrop={dropBefore}
      onKeyDown={keyDown}
      padding="sm"
      tone={daily?.focused ? "accent" : "default"}
    >
      <p className="sr-only" id={instructionsId}>Drag to reorder, or use Alt with the up and down arrow keys.</p>
      <div className={spacingStyles.detailStack}>
        <div className="flex items-start justify-between gap-cluster">
          <div className="min-w-0">
            <h4 className={typographyStyles.cardTitle} id={titleId}>
              <a className={colorStyles.focusRing} draggable={false} href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</a>
            </h4>
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
              {project ? `${project.title} · ${project.outcome}` : props.value.area ? `${props.value.area.icon} ${props.value.area.title}` : "Standalone Task"}
            </p>
          </div>
          <div className={spacingStyles.cluster}>
            {daily?.focused ? <Badge variant="attention">Focus</Badge> : null}
            {daily?.pinned ? <Badge variant="neutral">Pinned</Badge> : null}
            {props.pending ? <Badge variant="attention">Saving…</Badge> : null}
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
        <TaskMetadata task={task} />
        <div className={spacingStyles.cluster}>
          {daily?.focused ? (
            props.disabled ? (
              <Button disabled size="sm">Open session</Button>
            ) : (
              <ButtonLink href="/focus" size="sm">Open session</ButtonLink>
            )
          ) : (
            <Button disabled={props.disabled} onClick={props.onFocus} size="sm">
              Focus
            </Button>
          )}
          <Button disabled={props.disabled} onClick={() => props.onPin(!daily?.pinned)} size="sm" variant="secondary">
            {daily?.pinned ? "Unpin" : "Pin"}
          </Button>
          <DailyTaskGroupForm disabled={props.disabled} group={daily?.group ?? null} groupNames={props.groupNames} onSave={props.onGroup} />
        </div>
        <details>
          <summary
            className={cn(
              getButtonClassName({ size: "sm", variant: "ghost" }),
              "w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden",
            )}
          >
            More actions
          </summary>
          <div className={cn("pt-card-compact", spacingStyles.cluster)}>
            <Button aria-keyshortcuts="Alt+ArrowUp" disabled={props.disabled || props.position.current === 1} onClick={() => props.onMove("up")} size="sm" variant="ghost">Move up</Button>
            <Button aria-keyshortcuts="Alt+ArrowDown" disabled={props.disabled || props.position.current === props.position.total} onClick={() => props.onMove("down")} size="sm" variant="ghost">Move down</Button>
            <Button disabled={props.disabled} onClick={props.onRemove} size="sm" variant="ghost">Remove from today</Button>
            <Button disabled={props.disabled} onClick={props.onArchive} size="sm" variant="danger">Archive</Button>
          </div>
        </details>
      </div>
    </Card>
  );
}

export { DailyTaskCard };
export type { DailyTaskCardProps };
