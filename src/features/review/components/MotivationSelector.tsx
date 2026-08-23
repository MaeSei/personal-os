import {
  RatingSelector,
  type RatingSelectorProps,
} from "@/features/review/components/RatingSelector";

type MotivationSelectorProps = Pick<RatingSelectorProps, "onChange" | "value">;

function MotivationSelector(props: MotivationSelectorProps) {
  return (
    <RatingSelector
      description="How willing do you feel to begin meaningful work?"
      label="Motivation"
      name="motivation"
      {...props}
    />
  );
}

export { MotivationSelector, type MotivationSelectorProps };
