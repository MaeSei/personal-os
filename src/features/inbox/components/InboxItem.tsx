import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Item } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

const capturedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

type InboxItemProps = {
  item: Pick<Item, "createdAt" | "id" | "title">;
};

function InboxItem({ item }: InboxItemProps) {
  return (
    <li>
      <Card as="article">
        <div
          className={cn(
            "flex flex-col items-start sm:flex-row sm:justify-between",
            spacingStyles.cluster,
          )}
        >
          <div className="min-w-0">
            <h3
              className={cn(
                typographyStyles.itemTitle,
                colorStyles.text.primary,
              )}
            >
              {item.title}
            </h3>
            <time
              className={cn(
                "mt-detail block",
                typographyStyles.description,
                colorStyles.text.muted,
              )}
              dateTime={item.createdAt.toISOString()}
            >
              {capturedAtFormatter.format(item.createdAt)}
            </time>
          </div>
          <Badge variant="neutral">Unsorted</Badge>
        </div>
      </Card>
    </li>
  );
}

export { InboxItem, type InboxItemProps };
