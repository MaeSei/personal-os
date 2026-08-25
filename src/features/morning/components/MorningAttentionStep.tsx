import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { AttentionBudget } from "@/features/planner/components/AttentionBudget";
import { spacingStyles } from "@/theme/spacing";

type MorningAttentionStepProps = {
  readonly attention: DailyPlannerData["attention"];
  readonly onBack: () => void;
  readonly onNext: () => void;
};

function MorningAttentionStep({
  attention,
  onBack,
  onNext,
}: MorningAttentionStepProps) {
  return (
    <div className={spacingStyles.cardStack}>
      <AttentionBudget attention={attention} />
      <MorningStepActions
        nextLabel="Review calendar"
        onBack={onBack}
        onNext={onNext}
      />
    </div>
  );
}

export { MorningAttentionStep };
