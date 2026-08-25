"use client";

import { useState } from "react";

import { fieldClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionableItem } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusSwitchProps = {
  readonly disabled: boolean;
  readonly onSwitch: (taskId: string) => Promise<void>;
  readonly tasks: readonly ActionableItem[];
};

/** Makes changing direction deliberate and pauses the previous task's timer. */
function FocusSwitch({ disabled, onSwitch, tasks }: FocusSwitchProps) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const selectedTaskId = tasks.some(({ id }) => id === taskId)
    ? taskId
    : tasks[0]?.id ?? "";

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <div>
          <h3 className={typographyStyles.cardTitle}>Switch task</h3>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Switching pauses the current timer. The next timer starts only when you resume.
          </p>
        </div>
        {tasks.length > 0 ? (
          <>
            <div className={spacingStyles.detailStack}>
              <label className={labelClassName} htmlFor="focus-switch-task">Next task</label>
              <select
                className={fieldClassName}
                disabled={disabled}
                id="focus-switch-task"
                onChange={(event) => setTaskId(event.target.value)}
                value={selectedTaskId}
              >
                {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </select>
            </div>
            <div className={spacingStyles.cluster}>
              <Button disabled={disabled || !selectedTaskId} onClick={() => void onSwitch(selectedTaskId)} variant="secondary">
                Switch
              </Button>
            </div>
          </>
        ) : (
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            No other tasks are in today&apos;s workspace.
          </p>
        )}
      </div>
    </Card>
  );
}

export { FocusSwitch, type FocusSwitchProps };
