"use client";

import type { FormEvent } from "react";

import { fieldClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  PlannerAvailableSlot,
  PlannerTask,
} from "@/features/contracts/PlannerFeature";
import { TaskDropZone } from "@/features/planner/components/TaskDropZone";
import { formatClockTime, formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AvailableSlotsProps = {
  readonly disabled: boolean;
  readonly onSchedule: (taskId: string, start: number) => Promise<boolean>;
  readonly slots: readonly PlannerAvailableSlot[];
  readonly tasks: readonly PlannerTask[];
};

function AvailableSlots(props: AvailableSlotsProps) {
  async function submit(
    event: FormEvent<HTMLFormElement>,
    slot: PlannerAvailableSlot,
  ) {
    event.preventDefault();
    const taskId = String(new FormData(event.currentTarget).get("taskId") || "");
    if (taskId) await props.onSchedule(taskId, slot.start);
  }

  if (props.slots.length === 0) {
    return (
      <EmptyState
        description="Calendar commitments, breaks, and existing Time Blocks fill the working window. Move or remove a reservation to make room."
        title="No available slots"
      />
    );
  }

  return (
    <div className={spacingStyles.detailStack}>
      <h3 className={cn(typographyStyles.label, colorStyles.text.muted)}>
        Available slots
      </h3>
      <div className="grid gap-detail md:grid-cols-2">
        {props.slots.map((slot) => {
          const label = `${formatClockTime(slot.start)}–${formatClockTime(slot.end)}`;
          return (
            <TaskDropZone
              className="p-card-compact"
              disabled={props.disabled}
              key={`${slot.start}-${slot.end}`}
              label={`${label}, ${formatDuration(slot.duration)} available. Drop a Task to schedule it.`}
              onDropTask={(taskId) => void props.onSchedule(taskId, slot.start)}
            >
              <div className={spacingStyles.detailStack}>
                <div className="flex items-baseline justify-between gap-cluster">
                  <p className={typographyStyles.cardTitle}>{label}</p>
                  <p className={cn(typographyStyles.metricValue, colorStyles.text.accent)}>
                    {formatDuration(slot.duration)}
                  </p>
                </div>
                <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                  Drop a Task here to create a Focus block.
                </p>
                {props.tasks.length > 0 ? (
                  <details>
                    <summary className={cn("cursor-pointer", colorStyles.focusRing, typographyStyles.metricLabel)}>
                      Schedule without dragging
                    </summary>
                    <form
                      className={cn("pt-detail", spacingStyles.cluster)}
                      onSubmit={(event) => void submit(event, slot)}
                    >
                      <label className="sr-only" htmlFor={`available-slot-${slot.start}`}>
                        Task for {label}
                      </label>
                      <select
                        className={fieldClassName}
                        disabled={props.disabled}
                        id={`available-slot-${slot.start}`}
                        name="taskId"
                      >
                        {props.tasks.map((task) => (
                          <option key={task.id} value={task.id}>{task.title}</option>
                        ))}
                      </select>
                      <Button disabled={props.disabled} size="sm" type="submit">
                        Schedule
                      </Button>
                    </form>
                  </details>
                ) : (
                  <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                    Every actionable Task already has a time.
                  </p>
                )}
              </div>
            </TaskDropZone>
          );
        })}
      </div>
    </div>
  );
}

export { AvailableSlots };
