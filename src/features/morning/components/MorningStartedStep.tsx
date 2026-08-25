import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type MorningStartedStepProps = Pick<
  DailyPlannerData,
  "commitments" | "timeBlocks"
>;

function MorningStartedStep({
  commitments,
  timeBlocks,
}: MorningStartedStepProps) {
  return (
    <Card as="article" padding="lg" tone="accent">
      <div className={spacingStyles.cardStack}>
        <Badge variant="success">Day started</Badge>
        <div className={spacingStyles.detailStack}>
          <h2 className={cn(typographyStyles.display, colorStyles.text.primary)}>
            Your attention has a direction.
          </h2>
          <p className={cn(typographyStyles.lead, colorStyles.text.muted)}>
            {commitments.length} {commitments.length === 1 ? "Task" : "Tasks"} and{" "}
            {timeBlocks.length} {timeBlocks.length === 1 ? "Time Block" : "Time Blocks"} are now active.
          </p>
        </div>
        <div className={spacingStyles.cluster}>
          <ButtonLink href="/" size="lg">Workspace</ButtonLink>
          <ButtonLink href="/focus" size="lg" variant="secondary">
            Open Focus Mode
          </ButtonLink>
          <ButtonLink href="/planner" size="lg" variant="ghost">
            Reopen Planner
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

export { MorningStartedStep };
