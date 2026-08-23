import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { Item } from "@/domain";
import { FocusItem } from "@/features/mission-control/components/FocusItem";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";

type BlockedSectionProps = {
  items: readonly Item[];
};

function BlockedSection({ items }: BlockedSectionProps) {
  return (
    <Section id="blocked" title="Blocked">
      {items.length === 0 ? (
        <EmptyState
          description="Nothing is currently preventing progress."
          title="No blockers"
        />
      ) : (
        <Card padding="none">
          <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
            {items.map((item) => (
              <FocusItem
                item={item}
                key={item.id}
                trailing={<Badge variant="warning">Waiting</Badge>}
              />
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}

export { BlockedSection, type BlockedSectionProps };
