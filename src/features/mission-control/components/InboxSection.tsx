import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type InboxSectionProps = {
  action?: ReactNode;
  count: number;
};

function InboxSection({ action, count }: InboxSectionProps) {
  const itemLabel = count === 1 ? "Item" : "Items";

  return (
    <Section action={action} id="inbox" title="Inbox">
      {count === 0 ? (
        <EmptyState
          description="Your Inbox is clear. Capture a thought whenever you are ready to put it down."
          title="No inbox items"
        />
      ) : (
        <Card padding="lg">
          <p className={cn(spacingStyles.cluster, "items-baseline")}>
            <span
              className={cn(typographyStyles.metric, colorStyles.text.primary)}
            >
              {count}
            </span>
            <span
              className={cn(typographyStyles.body, colorStyles.text.muted)}
            >
              {itemLabel}
            </span>
          </p>
        </Card>
      )}
    </Section>
  );
}

export { InboxSection, type InboxSectionProps };
