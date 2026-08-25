import { Button } from "@/components/ui/Button";
import { spacingStyles } from "@/theme/spacing";

type MorningStepActionsProps = {
  readonly disabled?: boolean;
  readonly nextLabel: string;
  readonly onBack?: () => void;
  readonly onNext: () => void;
};

function MorningStepActions({
  disabled = false,
  nextLabel,
  onBack,
  onNext,
}: MorningStepActionsProps) {
  return (
    <div className={spacingStyles.cluster}>
      <Button disabled={disabled} onClick={onNext} size="lg">
        {nextLabel}
      </Button>
      {onBack ? (
        <Button disabled={disabled} onClick={onBack} size="lg" variant="ghost">
          Back
        </Button>
      ) : null}
    </div>
  );
}

export { MorningStepActions };
