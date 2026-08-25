"use client";

import { useRef } from "react";

import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { PlanningArea } from "@/features/planner/components/PlanningArea";
import { spacingStyles } from "@/theme/spacing";

type MorningWorkspaceStepProps = Pick<
  DailyPlannerData,
  "commitments" | "suggestions" | "timeBlocks"
> & {
  readonly disabled: boolean;
  readonly onBack: () => void;
  readonly onMove: (taskId: string, direction: "down" | "up") => void;
  readonly onNext: () => void;
  readonly onPlace: (taskId: string, beforeTaskId?: string | null) => Promise<boolean>;
  readonly onRemove: (taskId: string) => Promise<boolean>;
  readonly onSchedule: (taskId: string, start: number) => Promise<boolean>;
  readonly onUnschedule: (taskId: string) => void;
};

function MorningWorkspaceStep(props: MorningWorkspaceStepProps) {
  const planFocusRef = useRef<HTMLDivElement>(null);

  return (
    <div className={spacingStyles.cardStack}>
      <PlanningArea {...props} focusRef={planFocusRef} />
      <MorningStepActions
        disabled={props.disabled}
        nextLabel="Plan time blocks"
        onBack={props.onBack}
        onNext={props.onNext}
      />
    </div>
  );
}

export { MorningWorkspaceStep };
