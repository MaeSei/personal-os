"use client";

import type { RefObject } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { PlannerTaskCard } from "@/features/planner/components/PlannerTaskCard";
import { TaskDropZone } from "@/features/planner/components/TaskDropZone";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type PlanningAreaProps = Pick<DailyPlannerData, "commitments" | "suggestions" | "timeBlocks"> & {
  readonly disabled: boolean;
  readonly focusRef?: RefObject<HTMLDivElement | null>;
  readonly onMove: (taskId: string, direction: "down" | "up") => void;
  readonly onPlace: (taskId: string, beforeTaskId?: string | null) => Promise<boolean>;
  readonly onRemove: (taskId: string) => Promise<boolean>;
  readonly onSchedule?: (taskId: string, start: number) => Promise<boolean>;
  readonly onUnschedule: (taskId: string) => void;
};

function PlanningArea({
  commitments,
  disabled,
  focusRef,
  onMove,
  onPlace,
  onRemove,
  onSchedule,
  onUnschedule,
  suggestions,
  timeBlocks,
}: PlanningAreaProps) {
  const scheduledIds = new Set(
    timeBlocks.flatMap(({ linkedTasks }) => linkedTasks.map(({ id }) => id)),
  );

  async function placeAndFocus(taskId: string, beforeTaskId?: string | null) {
    if (await onPlace(taskId, beforeTaskId)) {
      focusRef?.current?.focus();
    }
  }

  async function removeAndFocus(taskId: string) {
    if (await onRemove(taskId)) {
      focusRef?.current?.focus();
    }
  }

  return (
    <Section
      description="Choose the work that belongs today. Suggestions remain optional until you add or schedule them."
      id="suggested-planning"
      title="Today&apos;s Tasks"
    >
      {suggestions.length > 0 ? (
        <div className={spacingStyles.detailStack}>
          <h3 className={cn(typographyStyles.label, colorStyles.text.muted)}>Suggested, not chosen</h3>
          <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
            {suggestions.map(({ placement, reason, task }) => (
              <PlannerTaskCard
                disabled={disabled}
                key={task.id}
                onAdd={() => void placeAndFocus(task.id)}
                onScheduleSuggested={onSchedule
                  ? () => void onSchedule(task.id, placement.start)
                  : undefined}
                reason={reason}
                suggestedPlacement={placement}
                task={task}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          No rule-based suggestions right now. You can still choose any available Task.
        </p>
      )}

      <div className={spacingStyles.detailStack}>
        <h3 className={cn(typographyStyles.label, colorStyles.text.muted)}>Chosen for today</h3>
        <TaskDropZone
          className={cn("min-h-32 p-card", spacingStyles.cardStack)}
          disabled={disabled}
          focusRef={focusRef}
          label="Today's chosen Task order. Drop a Task to add it at the end."
          onDropTask={(taskId) => void placeAndFocus(taskId, null)}
        >
          {commitments.length === 0 ? (
            <EmptyState
              description="Drag a Task here or use Add to today. Atlas will not fill the day automatically."
              title="No work chosen yet"
            />
          ) : commitments.map((task, index) => (
            <PlannerTaskCard
              disabled={disabled}
              isScheduled={scheduledIds.has(task.id)}
              key={task.id}
              onDropBefore={(draggedId) => void placeAndFocus(draggedId, task.id)}
              onMove={(direction) => onMove(task.id, direction)}
              onRemove={() => void removeAndFocus(task.id)}
              onUnschedule={() => onUnschedule(task.id)}
              position={{ current: index + 1, total: commitments.length }}
              task={task}
            />
          ))}
        </TaskDropZone>
      </div>
    </Section>
  );
}

export { PlanningArea };
