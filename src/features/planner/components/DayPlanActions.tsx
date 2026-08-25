import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { DayPlanStatus } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type DayPlanActionsProps = {
  readonly disabled: boolean;
  readonly persisted: boolean;
  readonly onSaveDraft: () => void;
  readonly onStartDay: () => void;
  readonly status: DayPlanStatus;
};

/** Makes the draft-to-execution boundary visible and explicit. */
function DayPlanActions({
  disabled,
  onSaveDraft,
  onStartDay,
  persisted,
  status,
}: DayPlanActionsProps) {
  const started = status === DayPlanStatus.Started;

  return (
    <Card as="article" padding="lg" tone={started ? "accent" : "subtle"}>
      <div className={spacingStyles.cardStack}>
        <div className={spacingStyles.detailStack}>
          <Badge variant={started ? "success" : "neutral"}>
            {started ? "Day started" : persisted ? "Draft saved" : "Not saved yet"}
          </Badge>
          <h2 className={cn(typographyStyles.sectionTitle, colorStyles.text.primary)}>
            {started ? "Your plan is active." : "Ready to begin?"}
          </h2>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            {started
              ? "Mission Control and Focus Mode now follow this intentional order."
              : "Planning changes remain a draft until you explicitly start the day."}
          </p>
        </div>
        <div className={spacingStyles.cluster}>
          {started ? (
            <>
              <ButtonLink href="/" size="lg">Mission Control</ButtonLink>
              <ButtonLink href="/focus" size="lg" variant="secondary">
                Open Focus Mode
              </ButtonLink>
            </>
          ) : (
            <>
              <Button disabled={disabled} onClick={onStartDay} size="lg">
                Start day
              </Button>
              <Button
                disabled={disabled}
                onClick={onSaveDraft}
                size="lg"
                variant="secondary"
              >
                Save draft
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export { DayPlanActions, type DayPlanActionsProps };
