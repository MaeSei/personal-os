"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { InboxCapture } from "@/features/inbox/components/InboxCapture";
import { InboxList } from "@/features/inbox/components/InboxList";
import { useInbox } from "@/features/inbox/hooks/useInbox";
import type { InboxRepository } from "@/repositories/InboxRepository";
import { LocalStorageRepository } from "@/repositories/LocalStorageRepository";
import { spacingStyles } from "@/theme/spacing";

const inboxRepository: InboxRepository = new LocalStorageRepository();

function Inbox() {
  const { announcement, capture, error, isLoading, items } =
    useInbox(inboxRepository);

  return (
    <PageContainer className={spacingStyles.pageWithFloatingControl}>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={
            <ButtonLink href="/" variant="secondary">
              Mission Control
            </ButtonLink>
          }
          description="Capture first. Decide what it means later."
          eyebrow="Inbox"
          title="Clear your mind."
        />

        <Section
          description="Uncategorized thoughts waiting for a deliberate decision."
          id="inbox-items"
          title="Inbox"
        >
          <InboxList error={error} isLoading={isLoading} items={items} />
        </Section>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      <InboxCapture onCapture={capture} />
    </PageContainer>
  );
}

export { Inbox };
