"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { InboxProcessor } from "@/features/inbox/components/InboxProcessor";
import { useInbox } from "@/features/inbox/hooks/useInbox";
import { useFeatures } from "@/features/FeatureProvider";

type InboxRailProps = {
  readonly onWorkspaceChange: () => void;
};

function InboxRail({ onWorkspaceChange }: InboxRailProps) {
  const { inbox: inboxFeature } = useFeatures();
  const inbox = useInbox(inboxFeature, { onProcessed: onWorkspaceChange });

  return (
    <aside aria-label="Inbox">
      <Section
        action={
          <ButtonLink href="/inbox" size="sm" variant="ghost">
            Full Inbox
          </ButtonLink>
        }
        description={
          inbox.isLoading
            ? "Gathering thoughts that still need a clear place."
            : `${inbox.items.length} ${inbox.items.length === 1 ? "thought" : "thoughts"} waiting for a clear place.`
        }
        id="workspace-inbox"
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
        <p aria-live="polite" className="sr-only" role="status">
          {inbox.announcement}
        </p>
      </Section>
    </aside>
  );
}

export { InboxRail, type InboxRailProps };
