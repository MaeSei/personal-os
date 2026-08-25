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
                <ButtonLink href="/morning" size="sm" variant="secondary">
                  Morning planning
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              action={
                <ButtonLink href="/morning" size="sm" variant="secondary">
                  Start morning planning
                </ButtonLink>
              }
              description="A short check-in will help Atlas understand how much attention is available."
              title="No Daily Review yet"
            />
          )}
        </div>

        <TodaySection
          action={
            <div className={spacingStyles.cluster}>
              <ButtonLink href="/morning" size="sm" variant="secondary">
                Morning planning
              </ButtonLink>
              <ButtonLink href="/planner" size="sm" variant="secondary">
                Open Planner
              </ButtonLink>
              <ButtonLink href="/focus" size="sm" variant="secondary">
                Open Focus Mode
              </ButtonLink>
            </div>
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
