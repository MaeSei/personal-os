import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type GreetingCardProps = {
  dateLabel: string;
  dateTime: string;
  name: string;
  salutation: string;
};

function GreetingCard({
  dateLabel,
  dateTime,
  name,
  salutation,
}: GreetingCardProps) {
  return (
    <Card padding="lg" tone="accent">
      <header className={spacingStyles.heroContent}>
        <h1
          className={cn(typographyStyles.display, colorStyles.text.primary)}
        >
          {salutation}, {name}
        </h1>
        <time
          className={cn(
            "mt-card block",
            typographyStyles.lead,
            colorStyles.text.accent,
          )}
          dateTime={dateTime}
        >
          {dateLabel}
        </time>
      </header>
    </Card>
  );
}

export { GreetingCard, type GreetingCardProps };
