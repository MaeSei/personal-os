"use client";

import { useRef } from "react";

import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { PlanningArea } from "@/features/planner/components/PlanningArea";
import { spacingStyles } from "@/theme/spacing";

type MorningSuggestionsStepProps = Pick<
  DailyPlannerData,
  "commitments" | "suggestions" | "timeBlocks"
> & {
  readonly disabled: boolean;
  readonly onBack: () => void;
  readonly onMove: (taskId: string, direction: "down" | "up") => void;
  readonly onNext: () => void;
  readonly onPlace: (taskId: string, beforeTaskId?: string | null) => Promise<boolean>;
  readonly onRemove: (taskId: string) => Promise<boolean>;
  readonly onUnschedule: (taskId: string) => void;
};

function MorningSuggestionsStep(props: MorningSuggestionsStepProps) {
  const planFocusRef = useRef<HTMLDivElement>(null);

  return (
    <div className={spacingStyles.cardStack}>
      <PlanningArea {...props} focusRef={planFocusRef} />
      <MorningStepActions
        disabled={props.disabled}
        nextLabel="Adjust the plan"
        onBack={props.onBack}
        onNext={props.onNext}
      />
    </div>
  );
}

export { MorningSuggestionsStep };
