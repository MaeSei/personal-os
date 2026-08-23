import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type RatingProps = {
  accent?: boolean;
  label: string;
  max: number;
  value: number;
};

type AttentionCardProps = {
  action?: ReactNode;
  budget: number;
  energy: number;
  ratingScale: number;
  stress: number;
};

function Rating({ accent = false, label, max, value }: RatingProps) {
  const safeMax = Math.max(1, Math.floor(max));
  const safeValue = Math.min(Math.max(value, 0), safeMax);

  return (
    <div className={spacingStyles.detailStack}>
      <dt className="flex items-center justify-between">
        <span
          className={cn(
            typographyStyles.metricLabel,
            colorStyles.text.primary,
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            typographyStyles.metricValue,
            colorStyles.text.muted,
          )}
        >
          {safeValue}/{safeMax}
        </span>
      </dt>
      <dd
        aria-label={`${label}: ${safeValue} out of ${safeMax}`}
        className={cn(spacingStyles.rating, typographyStyles.rating)}
        role="img"
      >
        {Array.from({ length: safeMax }, (_, index) => (
          <span
            aria-hidden="true"
            className={
              index < safeValue
                ? accent
                  ? colorStyles.rating.accent
                  : colorStyles.rating.neutral
                : colorStyles.rating.empty
            }
            key={index}
          >
            ★
          </span>
        ))}
      </dd>
    </div>
  );
}

function AttentionCard({
  action,
  budget,
  energy,
  ratingScale,
  stress,
}: AttentionCardProps) {
  const safeBudget = Math.min(Math.max(budget, 0), 100);

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <div className={spacingStyles.detailStack}>
          <h2
            className={cn(
              typographyStyles.metricLabel,
              colorStyles.text.accent,
            )}
          >
            Attention Budget
          </h2>
          <p
            className={cn(typographyStyles.metric, colorStyles.text.primary)}
          >
            {safeBudget}%
          </p>
        </div>
        <Divider />
        <dl className={cn(spacingStyles.cardGrid, "sm:grid-cols-2")}>
          <Rating accent label="Energy" max={ratingScale} value={energy} />
          <Rating label="Stress" max={ratingScale} value={stress} />
        </dl>
        {action ? (
          <>
            <Divider />
            <div className={spacingStyles.cluster}>{action}</div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

export { AttentionCard, type AttentionCardProps };
