import {
  RatingSelector,
  type RatingSelectorProps,
} from "@/features/review/components/RatingSelector";

type EnergySelectorProps = Pick<RatingSelectorProps, "onChange" | "value">;

function EnergySelector(props: EnergySelectorProps) {
  return (
    <RatingSelector
      description="How much physical and mental energy is available?"
      label="Energy"
      name="energy"
      {...props}
    />
  );
}

export { EnergySelector, type EnergySelectorProps };
