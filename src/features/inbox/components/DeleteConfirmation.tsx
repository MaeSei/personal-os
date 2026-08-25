import { Button } from "@/components/ui/Button";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";
import { cn } from "@/lib/cn";

type DeleteConfirmationProps = {
  readonly disabled: boolean;
  readonly onBack: () => void;
  readonly onDelete: () => void;
};

function DeleteConfirmation({
  disabled,
  onBack,
  onDelete,
}: DeleteConfirmationProps) {
  return (
    <div className={spacingStyles.cardStack}>
      <p className={cn(typographyStyles.body, colorStyles.text.muted)}>
        This removes the thought from this browser. It cannot be recovered.
      </p>
      <div className={spacingStyles.cluster}>
        <Button disabled={disabled} onClick={onDelete} variant="danger">
          {disabled ? "Deleting…" : "Delete Item"}
        </Button>
        <Button autoFocus disabled={disabled} onClick={onBack} variant="ghost">
          Keep it
        </Button>
      </div>
    </div>
  );
}

export { DeleteConfirmation };
