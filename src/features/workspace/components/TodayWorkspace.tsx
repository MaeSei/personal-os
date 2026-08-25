import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { WorkspaceTaskFilters } from "@/domain";
import type { WorkspaceData } from "@/features/contracts/WorkspaceFeature";
import { DailyTaskGroup, type PlaceTask } from "@/features/workspace/components/DailyTaskGroup";
import { DailyTaskPool } from "@/features/workspace/components/DailyTaskPool";
import { WorkspaceFilters } from "@/features/workspace/components/WorkspaceFilters";
import { countActiveWorkspaceFilters } from "@/features/workspace/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TodayWorkspaceProps = WorkspaceData["today"] & {
  readonly disabled: boolean;
  readonly filterOptions: WorkspaceData["filterOptions"];
  readonly filters: WorkspaceTaskFilters;
  readonly isFiltering: boolean;
  readonly onArchive: (taskId: string) => void;
  readonly onFiltersChange: (filters: WorkspaceTaskFilters) => void;
  readonly onFocus: (taskId: string) => void;
  readonly onGroup: (taskId: string, group: string | null) => void;
  readonly onPin: (taskId: string, pinned: boolean) => void;
  readonly onPlace: PlaceTask;
  readonly onRemove: (taskId: string) => void;
  readonly pendingTaskId: string | null;
};

function TodayWorkspace(props: TodayWorkspaceProps) {
  const groupNames = props.groups
    .map(({ title }) => title)
    .filter((title) => title !== "Ungrouped");
  const committedCount = props.pinned.length + props.groups.reduce(
    (total, group) => total + group.tasks.length,
    0,
  );
  const activeFilterCount = countActiveWorkspaceFilters(props.filters);

  return (
    <Section
      aria-busy={props.isFiltering || props.disabled}
      description="Choose the work that belongs close today. Atlas will not fill this space for you."
      id="today-workspace"
      title="Today’s Workspace"
    >
      <WorkspaceFilters
        disabled={props.isFiltering || props.disabled}
        filters={props.filters}
        isFiltering={props.isFiltering}
        key={JSON.stringify(props.filters)}
        onChange={props.onFiltersChange}
        options={props.filterOptions}
      />
      {props.focused ? (
        <Card
          aria-busy={props.pendingTaskId === props.focused.task.id}
          as="article"
          padding="sm"
          tone="accent"
        >
          <div className="flex flex-col items-start justify-between gap-card sm:flex-row sm:items-center">
            <div className={spacingStyles.detailStack}>
              <p className={cn(typographyStyles.label, colorStyles.text.accent)}>Current focus</p>
              <p className={typographyStyles.itemTitle}>{props.focused.task.title}</p>
            </div>
            <ButtonLink href="/focus" size="sm">Open Focus Session</ButtonLink>
          </div>
        </Card>
      ) : null}
      <Card aria-busy={props.disabled} padding="lg">
        <div className={spacingStyles.cardStack}>
          {committedCount === 0 && activeFilterCount > 0 ? (
            <EmptyState
              description="Clear or adjust the filters to return to the complete day."
              title="No daily Tasks match these filters"
            />
          ) : null}
          {committedCount === 0 && activeFilterCount === 0 ? (
            <DailyTaskGroup
              disabled={props.disabled}
              group={null}
              groupNames={groupNames}
              onArchive={props.onArchive}
              onFocus={props.onFocus}
              onGroup={props.onGroup}
              onPin={props.onPin}
              onPlace={props.onPlace}
              onRemove={props.onRemove}
              pendingTaskId={props.pendingTaskId}
              tasks={[]}
              title="Start here"
            />
          ) : null}
          {props.pinned.length > 0 ? (
            <DailyTaskGroup
              disabled={props.disabled}
              group={null}
              groupNames={groupNames}
              onArchive={props.onArchive}
              onFocus={props.onFocus}
              onGroup={props.onGroup}
              onPin={props.onPin}
              onPlace={props.onPlace}
              onRemove={props.onRemove}
              pendingTaskId={props.pendingTaskId}
              pinned
              tasks={props.pinned}
              title="Pinned"
            />
          ) : null}
          {props.groups.map((group) => (
            <DailyTaskGroup
              disabled={props.disabled}
              group={group.title === "Ungrouped" ? null : group.title}
              groupNames={groupNames}
              key={group.id}
              onArchive={props.onArchive}
              onFocus={props.onFocus}
              onGroup={props.onGroup}
              onPin={props.onPin}
              onPlace={props.onPlace}
              onRemove={props.onRemove}
              pendingTaskId={props.pendingTaskId}
              tasks={group.tasks}
              title={group.title}
            />
          ))}
          <DailyTaskPool
            activeFilterCount={activeFilterCount}
            disabled={props.disabled}
            onAdd={(taskId) => props.onPlace(taskId, null, null, false)}
            pendingTaskId={props.pendingTaskId}
            tasks={props.available}
          />
        </div>
      </Card>
    </Section>
  );
}

export { TodayWorkspace, type TodayWorkspaceProps };
