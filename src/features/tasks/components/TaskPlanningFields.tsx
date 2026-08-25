import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import type { TaskEditorValue } from "@/features/tasks/components/types";
import { TaskContextFields } from "@/features/tasks/components/TaskContextFields";
import { TaskEstimateFields } from "@/features/tasks/components/TaskEstimateFields";
import { preferredTimes } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskPlanningFieldsProps = {
  readonly idPrefix: string;
  readonly initialValue: TaskEditorValue;
};

function TaskPlanningFields({ idPrefix, initialValue }: TaskPlanningFieldsProps) {
  return (
    <details className={spacingStyles.cardStack}>
      <summary
        className={cn(
          "cursor-pointer",
          typographyStyles.metricLabel,
          colorStyles.text.accent,
          colorStyles.focusRing,
        )}
      >
        Planning details
      </summary>
      <div className="grid gap-card @md:grid-cols-2">
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-description`}>
            Description
          </label>
          <textarea
            className={fieldClassName}
            defaultValue={initialValue.description ?? ""}
            id={`${idPrefix}-description`}
            maxLength={1000}
            name="description"
            rows={3}
          />
        </div>
        <TaskContextFields contexts={initialValue.contexts} idPrefix={idPrefix} />
        <TaskEstimateFields idPrefix={idPrefix} initialValue={initialValue} />
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-due`}>
            Due date
          </label>
          <input
            className={fieldClassName}
            defaultValue={initialValue.dueDate ?? ""}
            id={`${idPrefix}-due`}
            name="dueDate"
            type="date"
          />
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-scheduled`}>
            Scheduled date
          </label>
          <input
            className={fieldClassName}
            defaultValue={initialValue.scheduledDate ?? ""}
            disabled={Boolean(initialValue.scheduledStart)}
            id={`${idPrefix}-scheduled`}
            name="scheduledDate"
            type="date"
          />
          {initialValue.scheduledStart ? (
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
              Exact scheduling is managed by its Planner Time Block.
            </p>
          ) : null}
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-preferred-time`}>
            Preferred time
          </label>
          <select
            className={fieldClassName}
            defaultValue={initialValue.preferredTime ?? ""}
            id={`${idPrefix}-preferred-time`}
            name="preferredTime"
          >
            <option value="">No preference</option>
            {preferredTimes.map((time) => <option key={time}>{time}</option>)}
          </select>
        </div>
      </div>
    </details>
  );
}

export { TaskPlanningFields };
