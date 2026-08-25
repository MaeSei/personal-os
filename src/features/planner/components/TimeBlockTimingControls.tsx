"use client";

import type { FormEvent } from "react";

import { fieldClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import type { PlannerTimeBlock } from "@/features/contracts/PlannerFeature";
import { formatClockTime, parseClockTime } from "@/features/planner/presentation";
import { spacingStyles } from "@/theme/spacing";

type TimeBlockTimingControlsProps = {
  readonly block: PlannerTimeBlock;
  readonly disabled: boolean;
  readonly locked: boolean;
  readonly onDuplicate: (start: number) => void;
  readonly onMove: (start: number) => void;
  readonly onResize: (end: number) => void;
  readonly onSplit: (splitAt: number) => void;
};

function TimeBlockTimingControls(props: TimeBlockTimingControlsProps) {
  const { block, disabled, locked } = props;

  function submit(
    event: FormEvent<HTMLFormElement>,
    field: string,
    action: (minute: number) => void,
  ) {
    event.preventDefault();
    action(parseClockTime(String(new FormData(event.currentTarget).get(field))));
  }

  const controls = [
    {
      action: props.onMove,
      defaultValue: block.start,
      field: "start",
      label: "Move to",
      requiresUnlocked: true,
    },
    {
      action: props.onResize,
      defaultValue: block.end,
      field: "end",
      label: "Resize end",
      requiresUnlocked: true,
    },
    {
      action: props.onSplit,
      defaultValue: Math.floor((block.start + block.end) / 2),
      field: "split",
      label: "Split at",
      requiresUnlocked: true,
    },
    {
      action: props.onDuplicate,
      defaultValue: block.end,
      field: "duplicate",
      label: "Duplicate at",
      requiresUnlocked: false,
    },
  ] as const;

  return (
    <div className="grid gap-detail md:grid-cols-2 xl:grid-cols-4">
      {controls.map((control) => (
        <form key={control.field} onSubmit={(event) => submit(event, control.field, control.action)}>
          <label className={labelClassName} htmlFor={`block-${block.id}-${control.field}`}>
            {control.label}
          </label>
          <div className={spacingStyles.cluster}>
            <input
              className={fieldClassName}
              defaultValue={formatClockTime(control.defaultValue)}
              disabled={disabled || (locked && control.requiresUnlocked)}
              id={`block-${block.id}-${control.field}`}
              name={control.field}
              required
              type="time"
            />
            <Button disabled={disabled || (locked && control.requiresUnlocked)} size="sm" type="submit" variant="secondary">
              {control.label.split(" ")[0]}
            </Button>
          </div>
        </form>
      ))}
    </div>
  );
}

export { TimeBlockTimingControls };
