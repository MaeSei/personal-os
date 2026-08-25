import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PlannerInboxItem } from "@/features/contracts/PlannerFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspaceInboxProps = {
  readonly inbox: readonly PlannerInboxItem[];
  readonly isFiltering?: boolean;
};

function WorkspaceInbox({
  inbox,
  isFiltering = false,
}: WorkspaceInboxProps) {
  if (inbox.length === 0) {
    return (
      <EmptyState
        description={isFiltering
          ? "Try a broader search or clear the query."
          : "New thoughts will appear here after capture."}
        title={isFiltering ? "No matching Inbox Items" : "Inbox is clear"}
      />
    );
  }

  const visible = inbox.slice(0, 5);
  return (
    <div className={spacingStyles.detailStack}>
      <ul className={cn("divide-y", colorStyles.itemList)}>
        {visible.map((item) => (
          <li className="py-card-compact first:pt-0 last:pb-0" key={item.id}>
            <p className={typographyStyles.metricLabel}>{item.title}</p>
          </li>
        ))}
      </ul>
      {inbox.length > visible.length ? (
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          {inbox.length - visible.length} more waiting in Inbox
        </p>
      ) : null}
      <ButtonLink href="/inbox" size="sm" variant="secondary">Process Inbox</ButtonLink>
    </div>
  );
}

export { WorkspaceInbox };
