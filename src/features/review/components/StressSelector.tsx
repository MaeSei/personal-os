import {
  RatingSelector,
  type RatingSelectorProps,
} from "@/features/review/components/RatingSelector";

type StressSelectorProps = Pick<RatingSelectorProps, "onChange" | "value">;

function StressSelector(props: StressSelectorProps) {
  return (
    <RatingSelector
      description="How much pressure or mental load are you carrying?"
      label="Stress"
      name="stress"
      {...props}
    />
  );
}

export { StressSelector, type StressSelectorProps };
