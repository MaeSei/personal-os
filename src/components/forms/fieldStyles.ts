import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

const fieldClassName = cn(
  "w-full border p-card-compact",
  radiusStyles.control,
  typographyStyles.body,
  colorStyles.field,
  colorStyles.focusRing,
  motionStyles.field,
);

const labelClassName = cn(
  "block",
  typographyStyles.metricLabel,
  colorStyles.text.primary,
);

const fieldGroupClassName = spacingStyles.detailStack;
const formGridClassName = "grid gap-card sm:grid-cols-2";

export {
  fieldClassName,
  fieldGroupClassName,
  formGridClassName,
  labelClassName,
};
