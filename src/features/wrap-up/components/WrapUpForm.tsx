"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import {
  EstimateAssessment,
  MAX_WRAP_UP_NOTES_LENGTH,
  PlanAssessment,
} from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AssessmentFieldProps<Value extends string> = {
  readonly label: string;
  readonly onChange: (value: Value) => void;
  readonly options: readonly { readonly label: string; readonly value: Value }[];
  readonly value: Value | null;
};

function AssessmentField<Value extends string>(props: AssessmentFieldProps<Value>) {
  return (
    <fieldset className={spacingStyles.detailStack}>
      <legend className={typographyStyles.cardTitle}>{props.label}</legend>
      <div className={spacingStyles.cluster}>
        {props.options.map((option) => (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-detail border px-card-compact py-detail",
              radiusStyles.control,
              colorStyles.field,
              colorStyles.focusRing,
            )}
            key={option.value}
          >
            <input
              checked={props.value === option.value}
              className={cn("size-4 accent-accent", colorStyles.focusRing)}
              name={props.label}
              onChange={() => props.onChange(option.value)}
              type="radio"
            />
            <span className={typographyStyles.metricLabel}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type WrapUpFormProps = {
  readonly canSubmit: boolean;
  readonly carryForwardCount: number;
  readonly error: string | null;
  readonly estimateAssessment: EstimateAssessment | null;
  readonly isSaving: boolean;
  readonly notes: string;
  readonly onEstimateAssessmentChange: (value: EstimateAssessment) => void;
  readonly onNotesChange: (value: string) => void;
  readonly onPlanAssessmentChange: (value: PlanAssessment) => void;
  readonly onSubmit: () => void;
  readonly planAssessment: PlanAssessment | null;
};

function WrapUpForm(props: WrapUpFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSubmit();
  }
  return (
    <Card padding="lg">
      <form className={spacingStyles.cardStack} onSubmit={submit}>
        <AssessmentField
          label="Did today go as planned?"
          onChange={props.onPlanAssessmentChange}
          options={[
            { label: "Yes", value: PlanAssessment.AsPlanned },
            { label: "Partly", value: PlanAssessment.Partly },
            { label: "No, it changed", value: PlanAssessment.Differently },
          ]}
          value={props.planAssessment}
        />
        <Divider />
        <AssessmentField
          label="Were time estimates accurate?"
          onChange={props.onEstimateAssessmentChange}
          options={[
            { label: "Mostly", value: EstimateAssessment.Accurate },
            { label: "Mixed", value: EstimateAssessment.Mixed },
            { label: "Mostly not", value: EstimateAssessment.Inaccurate },
            { label: "Not enough data", value: EstimateAssessment.NotEnoughData },
          ]}
          value={props.estimateAssessment}
        />
        <Divider />
        <div className={spacingStyles.detailStack}>
          <label className={typographyStyles.cardTitle} htmlFor="wrap-up-notes">
            Optional notes
          </label>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Record context, not a verdict. Atlas does not analyse this yet.
          </p>
          <textarea
            className={cn(
              "min-h-32 w-full resize-y border p-card-compact",
              radiusStyles.control,
              typographyStyles.body,
              colorStyles.field,
              colorStyles.focusRing,
              motionStyles.field,
            )}
            id="wrap-up-notes"
            maxLength={MAX_WRAP_UP_NOTES_LENGTH}
            onChange={(event) => props.onNotesChange(event.target.value)}
            placeholder="What affected the plan?"
            value={props.notes}
          />
        </div>
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          {props.carryForwardCount === 0
            ? "No unfinished work will move automatically."
            : `${props.carryForwardCount} unfinished ${props.carryForwardCount === 1 ? "Task" : "Tasks"} will be added to tomorrow's draft without a time.`}
        </p>
        <div className={cn(spacingStyles.cluster, "items-center")}>
          <Button disabled={!props.canSubmit || props.isSaving} size="lg" type="submit">
            {props.isSaving ? "Saving…" : "Complete wrap-up"}
          </Button>
          {props.error ? (
            <p className={cn(typographyStyles.description, colorStyles.text.danger)} role="alert">
              {props.error}
            </p>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export { WrapUpForm };
