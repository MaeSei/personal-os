import { Badge } from "@/components/ui/Badge";
import type { MorningStepId } from "@/features/morning/types";
import { morningSteps } from "@/features/morning/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { typographyStyles } from "@/theme/typography";

type MorningProgressProps = { readonly current: MorningStepId };

function MorningProgress({ current }: MorningProgressProps) {
  const currentIndex = morningSteps.findIndex(({ id }) => id === current);

  return (
    <nav aria-label="Morning planning progress">
      <ol className="grid grid-cols-2 gap-detail sm:grid-cols-5">
        {morningSteps.map(({ id, label }, index) => {
          const isCurrent = id === current;
          const complete = index < currentIndex;
          return (
            <li
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-detail",
                typographyStyles.description,
                complete || isCurrent
                  ? colorStyles.text.primary
                  : colorStyles.text.muted,
              )}
              key={id}
            >
              <Badge variant={isCurrent ? "attention" : complete ? "success" : "neutral"}>
                {complete ? "✓" : index + 1}
              </Badge>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { MorningProgress };
