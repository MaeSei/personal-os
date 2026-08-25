import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { estimateConfidenceLevels } from "@/domain";
import type { TaskEditorValue } from "@/features/tasks/components/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { typographyStyles } from "@/theme/typography";

type TaskEstimateFieldsProps = {
  readonly idPrefix: string;
  readonly initialValue: TaskEditorValue;
};

const effortLabels = ["Tiny", "Small", "Moderate", "Large", "Very large"];
const energyLabels = ["Very low", "Low", "Moderate", "High", "Very high"];

function TaskEstimateFields({ idPrefix, initialValue }: TaskEstimateFieldsProps) {
  return (
    <>
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
        <label className={labelClassName} htmlFor={`${idPrefix}-effort`}>
          Estimated effort
        </label>
        <select
          className={fieldClassName}
          defaultValue={initialValue.effort}
          id={`${idPrefix}-effort`}
          name="effort"
        >
          {effortLabels.map((label, index) => (
            <option key={label} value={index + 1}>{index + 1} · {label}</option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`${idPrefix}-energy`}>
          Estimated energy
        </label>
        <select
          className={fieldClassName}
          defaultValue={initialValue.energyCost}
          id={`${idPrefix}-energy`}
          name="energy"
        >
          {energyLabels.map((label, index) => (
            <option key={label} value={index + 1}>{index + 1} · {label}</option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`${idPrefix}-confidence`}>
          Confidence
        </label>
        <select
          className={fieldClassName}
          defaultValue={initialValue.estimateConfidence ?? ""}
          id={`${idPrefix}-confidence`}
          name="estimateConfidence"
        >
          <option value="">Not assessed</option>
          {estimateConfidenceLevels.map((confidence) => (
            <option key={confidence}>{confidence}</option>
          ))}
        </select>
      </div>
      <p className={cn(
        "@md:col-span-2",
        typographyStyles.description,
        colorStyles.text.muted,
      )}>
        Effort describes the amount of work. Energy describes how demanding it feels.
      </p>
    </>
  );
}

export { TaskEstimateFields, type TaskEstimateFieldsProps };
