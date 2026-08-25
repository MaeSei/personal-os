import {
  fieldClassName,
  fieldGroupClassName,
  formGridClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import type { TaskEditorValue } from "@/features/tasks/components/types";
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
      <div className={formGridClassName}>
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
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-preferred-context`}>
            Preferred context
          </label>
          <input
            className={fieldClassName}
            defaultValue={initialValue.preferredContext ?? ""}
            id={`${idPrefix}-preferred-context`}
            maxLength={80}
            name="preferredContext"
            placeholder="Office, phone, errands…"
          />
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-duration`}>
            Estimated duration in minutes
          </label>
          <input
            className={fieldClassName}
            defaultValue={initialValue.estimatedDuration ?? ""}
            id={`${idPrefix}-duration`}
            inputMode="numeric"
            min="1"
            name="duration"
            type="number"
          />
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-energy`}>
            Energy
          </label>
          <select
            className={fieldClassName}
            defaultValue={initialValue.energyCost}
            id={`${idPrefix}-energy`}
            name="energy"
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level} of 5
              </option>
            ))}
          </select>
        </div>
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
