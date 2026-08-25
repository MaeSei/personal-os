"use client";

import { useState, type DragEvent, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";

type TaskDropZoneProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly disabled: boolean;
  readonly focusRef?: RefObject<HTMLDivElement | null>;
  readonly id?: string;
  readonly label: string;
  readonly onDropTask: (taskId: string) => void;
};

/** Shared visual and event contract for Planner Task drop targets. */
function TaskDropZone({
  children,
  className,
  disabled,
  focusRef,
  id,
  label,
  onDropTask,
}: TaskDropZoneProps) {
  const [active, setActive] = useState(false);

  function dragOver(event: DragEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setActive(true);
  }

  function dragLeave(event: DragEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setActive(false);
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActive(false);
    if (disabled) return;
    const taskId = event.dataTransfer.getData("application/x-atlas-task-id") ||
      event.dataTransfer.getData("text/plain");
    if (taskId) onDropTask(taskId);
  }

  return (
    <div
      aria-disabled={disabled}
      aria-label={label}
      className={cn(
        "border border-dashed",
        radiusStyles.card,
        motionStyles.dropZone,
        colorStyles.focusRing,
        active
          ? "border-accent bg-accent-soft/60 shadow-card"
          : "border-border bg-surface/40",
        className,
      )}
      data-drop-active={active || undefined}
      id={id}
      onDragEnter={dragOver}
      onDragLeave={dragLeave}
      onDragOver={dragOver}
      onDrop={drop}
      ref={focusRef}
      role="group"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export { TaskDropZone };
