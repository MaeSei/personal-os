import { EmptyState } from "@/components/ui/EmptyState";
import type { Item } from "@/domain";
import { InboxItem } from "@/features/inbox/components/InboxItem";
import { spacingStyles } from "@/theme/spacing";

type InboxListProps = {
  error: string | null;
  isLoading: boolean;
  items: readonly Item[];
};

function InboxList({ error, isLoading, items }: InboxListProps) {
  if (isLoading) {
    return (
      <EmptyState
        description="Reading thoughts saved in this browser."
        status="status"
        title="Loading your Inbox"
      />
    );
  }

  return (
    <div className={spacingStyles.cardStack}>
      {error ? (
        <EmptyState
          description="Your saved thoughts have not been changed."
          status="alert"
          title={error}
        />
      ) : null}

      {items.length === 0 && !error ? (
        <EmptyState
          description="Your Inbox is clear. Capture anything you do not want to hold in your head."
          title="No inbox items"
        />
      ) : items.length > 0 ? (
        <ul className={spacingStyles.cardStack}>
          {items.map((item) => (
            <InboxItem item={item} key={item.id} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { InboxList, type InboxListProps };
