import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { AvailableTime } from "@/features/planner/components/AvailableTime";
import { spacingStyles } from "@/theme/spacing";

type MorningAvailabilityStepProps = Pick<
  DailyPlannerData,
  "attention" | "availableSlots" | "availableTime"
> & {
  readonly onBack: () => void;
  readonly onNext: () => void;
};

function MorningAvailabilityStep(props: MorningAvailabilityStepProps) {
  return (
    <div className={spacingStyles.cardStack}>
      <AvailableTime
        attention={props.attention}
        availableSlots={props.availableSlots}
        availableTime={props.availableTime}
      />
      <MorningStepActions
        nextLabel="Choose today&apos;s work"
        onBack={props.onBack}
        onNext={props.onNext}
      />
    </div>
  );
}

export { MorningAvailabilityStep };
