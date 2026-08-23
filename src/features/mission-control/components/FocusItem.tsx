import type { ComponentPropsWithoutRef, ReactNode } from "react";

import type { Item } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusItemProps = Omit<ComponentPropsWithoutRef<"li">, "children"> & {
  item: Pick<Item, "description" | "id" | "title">;
  projectOutcome?: string | null;
  trailing?: ReactNode;
};

function FocusItem({
  className,
  item,
  projectOutcome,
  trailing,
  ...props
}: FocusItemProps) {
  return (
    <li
      className={cn(
        "flex items-start sm:items-center",
        spacingStyles.item,
        className,
      )}
      data-slot="focus-item"
      {...props}
    >
      <div className={cn("min-w-0 flex-1", spacingStyles.detailStack)}>
        {projectOutcome ? (
          <div className={spacingStyles.detailStack}>
            <p className={cn(typographyStyles.label, colorStyles.text.accent)}>
              Outcome
            </p>
            <p
              className={cn(
                typographyStyles.itemTitle,
                colorStyles.text.primary,
              )}
            >
              {projectOutcome}
            </p>
          </div>
        ) : null}
        <div className={spacingStyles.detailStack}>
          {projectOutcome ? (
            <p className={cn(typographyStyles.label, colorStyles.text.muted)}>
              Supporting action
            </p>
          ) : null}
          <h3
            className={cn(
              projectOutcome
                ? typographyStyles.cardTitle
                : typographyStyles.itemTitle,
              colorStyles.text.primary,
            )}
          >
            {item.title}
          </h3>
          {item.description ? (
            <p
              className={cn(
                typographyStyles.description,
                colorStyles.text.muted,
              )}
            >
              {item.description}
            </p>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </li>
  );
}

export { FocusItem, type FocusItemProps };
