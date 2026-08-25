import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { typographyStyles } from "@/theme/typography";

type PlannerFeedbackProps = {
  readonly announcement: string;
  readonly isSaving: boolean;
};

function PlannerFeedback({ announcement, isSaving }: PlannerFeedbackProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="flex min-h-control-sm items-center"
      role="status"
    >
      {isSaving ? (
        <Badge className={motionStyles.loading} variant="attention">
          Saving changes…
        </Badge>
      ) : announcement ? (
        <p className={cn(typographyStyles.description, colorStyles.text.accent)}>
          {announcement}
        </p>
      ) : (
        <span className="sr-only">Planner ready.</span>
      )}
    </div>
  );
}

export { PlannerFeedback };
