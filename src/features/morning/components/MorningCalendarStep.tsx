import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { CalendarEvents } from "@/features/planner/components/CalendarEvents";
import { spacingStyles } from "@/theme/spacing";

type MorningCalendarStepProps = {
  readonly calendar: DailyPlannerData["calendar"];
  readonly onBack: () => void;
  readonly onNext: () => void;
};

function MorningCalendarStep({
  calendar,
  onBack,
  onNext,
}: MorningCalendarStepProps) {
  return (
    <Section
      description="External events are read-only context. Atlas never moves or creates them here."
      id="morning-calendar"
      title="What is already fixed?"
    >
      <Card padding="lg">
        <CalendarEvents calendar={calendar} />
      </Card>
      <div className={spacingStyles.cardStack}>
        <MorningStepActions
          nextLabel="See planning suggestions"
          onBack={onBack}
          onNext={onNext}
        />
      </div>
    </Section>
  );
}

export { MorningCalendarStep };
