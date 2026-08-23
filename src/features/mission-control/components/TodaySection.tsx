import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { ReactNode } from "react";
import { FocusItem } from "@/features/mission-control/components/FocusItem";
import type { MissionControlFocusItem } from "@/features/mission-control/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";

type TodaySectionProps = {
  action?: ReactNode;
  items: readonly MissionControlFocusItem[];
};

function TodaySection({ action, items }: TodaySectionProps) {
  return (
    <Section
      action={items.length > 0 ? action : undefined}
      id="todays-focus"
      title="Today's Focus"
    >
      {items.length === 0 ? (
        <EmptyState
          description="Your day is open. Add only what genuinely deserves your attention."
          title="No focus for today"
        />
      ) : (
        <Card padding="none">
          <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
            {items.map(({ item, projectOutcome }) => (
              <FocusItem
                item={item}
                key={item.id}
                projectOutcome={projectOutcome}
              />
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}

export { TodaySection, type TodaySectionProps };
