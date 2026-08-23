import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { AttentionCard } from "@/features/mission-control/components/AttentionCard";
import { AreasSection } from "@/features/mission-control/components/AreasSection";
import { BlockedSection } from "@/features/mission-control/components/BlockedSection";
import { GreetingCard } from "@/features/mission-control/components/GreetingCard";
import { InboxSection } from "@/features/mission-control/components/InboxSection";
import { TodaySection } from "@/features/mission-control/components/TodaySection";
import type { MissionControlData } from "@/features/mission-control/types";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type MissionControlProps = {
  data: MissionControlData;
};

function MissionControl({ data }: MissionControlProps) {
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
          <GreetingCard {...data.greeting} />
          {data.attention ? (
            <AttentionCard
              {...data.attention}
              action={
                <ButtonLink href="/review" size="sm" variant="secondary">
                  Complete daily review
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              action={
                <ButtonLink href="/review" size="sm" variant="secondary">
                  Complete daily review
                </ButtonLink>
              }
              description="A short check-in will help Atlas understand how much attention is available."
              title="No Daily Review yet"
            />
          )}
        </div>

        <TodaySection
          action={
            <ButtonLink href="/focus" size="sm" variant="secondary">
              Open Focus Mode
            </ButtonLink>
          }
          items={data.today}
        />

        <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
          <BlockedSection items={data.blocked} />
          <InboxSection
            {...data.inbox}
            action={
              <ButtonLink href="/inbox" size="sm" variant="secondary">
                Open Inbox
              </ButtonLink>
            }
          />
        </div>

        <AreasSection groups={data.projectGroups} />
      </div>
    </PageContainer>
  );
}

export { MissionControl, type MissionControlProps };
