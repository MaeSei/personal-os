"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { InboxProcessor } from "@/features/inbox/components/InboxProcessor";
import { useInbox } from "@/features/inbox/hooks/useInbox";
import { useFeatures } from "@/features/FeatureProvider";
import { spacingStyles } from "@/theme/spacing";

function Inbox() {
  const { inbox: inboxFeature } = useFeatures();
  const inbox = useInbox(inboxFeature);

  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={
            <ButtonLink href="/" variant="secondary">
              Workspace
            </ButtonLink>
          }
          description="Capture first. Decide what it means later."
          eyebrow="Inbox"
          title="Clear your mind."
        />

        <Section
          description="One thought at a time. Give it a clear place, then move on."
          id="inbox-items"
          title="Inbox"
        >
          <InboxProcessor
            addFirstTask={inbox.addFirstTask}
            areas={inbox.areas}
            deleteItem={inbox.deleteItem}
            error={inbox.error}
            focusVersion={inbox.focusVersion}
            finishProject={inbox.finishProject}
            isLoading={inbox.isLoading}
            isProcessing={inbox.isProcessing}
            items={inbox.items}
            processProject={inbox.processProject}
            processReference={inbox.processReference}
            processSomeday={inbox.processSomeday}
            processTask={inbox.processTask}
            projectFollowUp={inbox.projectFollowUp}
            projects={inbox.projects}
          />
        </Section>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {inbox.announcement}
      </p>
    </PageContainer>
  );
}

export { Inbox };
