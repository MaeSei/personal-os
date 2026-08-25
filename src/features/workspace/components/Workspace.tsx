import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { WorkspaceData } from "@/features/contracts/WorkspaceFeature";
import type { WorkspaceTaskFilters } from "@/domain";
import { InboxRail } from "@/features/workspace/components/InboxRail";
import { ProjectRail } from "@/features/workspace/components/ProjectRail";
import { TodayWorkspace } from "@/features/workspace/components/TodayWorkspace";
import { spacingStyles } from "@/theme/spacing";

type WorkspaceProps = {
  readonly announcement: string;
  readonly data: WorkspaceData | null;
  readonly error: string | null;
  readonly filters: WorkspaceTaskFilters;
  readonly isFiltering: boolean;
  readonly isLoading: boolean;
  readonly onArchive: (taskId: string) => void;
  readonly onFiltersChange: (filters: WorkspaceTaskFilters) => void;
  readonly onFocus: (taskId: string) => void;
  readonly onGroup: (taskId: string, group: string | null) => void;
  readonly onPin: (taskId: string, pinned: boolean) => void;
  readonly onPlace: (
    taskId: string,
    beforeTaskId?: string | null,
    group?: string | null,
    pinned?: boolean,
  ) => void;
  readonly onReload: () => void;
  readonly onRemove: (taskId: string) => void;
  readonly pendingTaskId: string | null;
};

function Workspace(props: WorkspaceProps) {
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={<ButtonLink href="/wrap-up" variant="secondary">Wrap up day</ButtonLink>}
          description="Your active outcomes, today’s work, and unprocessed thoughts—close enough to orient, quiet enough to think."
          eyebrow="Workspace"
          title="Sit down to what matters."
        />
        {props.error ? (
          <EmptyState
            action={
              <Button onClick={props.onReload} size="sm" variant="secondary">
                {props.data ? "Refresh" : "Try again"}
              </Button>
            }
            description={`${props.error} Refresh to confirm the latest saved state.`}
            status="alert"
            title="Workspace update paused"
          />
        ) : null}
        <div
          aria-busy={props.isLoading && !props.data}
          className="grid items-start gap-card md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,1fr)]"
        >
          <div className="md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
            {props.data ? (
              <TodayWorkspace
                {...props.data.today}
                disabled={props.pendingTaskId !== null}
                filterOptions={props.data.filterOptions}
                filters={props.filters}
                isFiltering={props.isFiltering}
                onArchive={props.onArchive}
                onFiltersChange={props.onFiltersChange}
                onFocus={props.onFocus}
                onGroup={props.onGroup}
                onPin={props.onPin}
                onPlace={props.onPlace}
                onRemove={props.onRemove}
                pendingTaskId={props.pendingTaskId}
              />
            ) : (
              <Section
                description="Choose the work that belongs close today. Atlas will not fill this space for you."
                id="today-workspace"
                title="Today’s Workspace"
              >
                <EmptyState
                  description={
                    props.error
                      ? "Retry above when you are ready. Your daily commitments remain safely stored."
                      : "Reading today’s intentional commitments and available Tasks."
                  }
                  status={props.error ? undefined : "status"}
                  title={props.error ? "Today is temporarily unavailable" : "Preparing today’s Workspace"}
                />
              </Section>
            )}
          </div>
          <div className="xl:col-start-1 xl:row-start-1">
            <ProjectRail
              error={props.data ? null : props.error}
              groups={props.data?.projectGroups ?? []}
              isLoading={props.isLoading}
              onRetry={props.onReload}
            />
          </div>
          <div className="xl:col-start-3 xl:row-start-1">
            <InboxRail onWorkspaceChange={props.onReload} />
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {props.announcement}
      </p>
    </PageContainer>
  );
}

export { Workspace, type WorkspaceProps };
