import { Button } from "@/components/ui/Button";
import type { KeyboardEvent } from "react";
import {
  REVIEW_RATINGS,
  type ReviewRating,
} from "@/features/review/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { typographyStyles } from "@/theme/typography";

type RatingSelectorProps = {
  description: string;
  label: string;
  name: string;
  onChange: (value: ReviewRating) => void;
  value: ReviewRating | null;
};

/** Accessible one-to-five selector shared by every Daily Review metric. */
function RatingSelector({
  description,
  label,
  name,
  onChange,
  value,
}: RatingSelectorProps) {
  const descriptionId = `${name}-description`;
  const legendId = `${name}-legend`;

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    rating: ReviewRating,
  ) {
    const currentIndex = REVIEW_RATINGS.indexOf(rating);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % REVIEW_RATINGS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + REVIEW_RATINGS.length) % REVIEW_RATINGS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = REVIEW_RATINGS.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextRating = REVIEW_RATINGS[nextIndex];
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]',
      );

    buttons?.[nextIndex]?.focus();
    onChange(nextRating);
  }

  return (
    <fieldset aria-describedby={descriptionId}>
      <legend
        className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}
        id={legendId}
      >
        {label}
      </legend>
      <p
        className={cn(
          "mt-detail",
          typographyStyles.description,
          colorStyles.text.muted,
        )}
        id={descriptionId}
      >
        {description}
      </p>
      <div
        aria-labelledby={legendId}
        className="mt-card grid grid-cols-5 gap-detail"
        role="radiogroup"
      >
        {REVIEW_RATINGS.map((rating) => (
          <Button
            aria-checked={value === rating}
            aria-label={`${label}: ${rating} out of 5`}
            className="w-full"
            key={rating}
            onClick={() => onChange(rating)}
            onKeyDown={(event) => handleKeyDown(event, rating)}
            role="radio"
            size="md"
            tabIndex={value === rating || (value === null && rating === 1) ? 0 : -1}
            type="button"
            variant={value === rating ? "primary" : "secondary"}
          >
            {rating}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

export { RatingSelector };
export type { RatingSelectorProps };
