import { WorkspaceInbox } from "@/features/planner/components/WorkspaceInbox";
import { CollapsiblePanel as WorkspacePanel } from "@/components/ui/CollapsiblePanel";
import { WorkspaceProjects } from "@/features/planner/components/WorkspaceProjects";
import { WorkspaceTaskPool } from "@/features/planner/components/WorkspaceTaskPool";
import type { WorkspaceSearchResults } from "@/features/planner/workspaceSearch";
import { spacingStyles } from "@/theme/spacing";

type WorkspaceContextRailProps = {
  readonly disabled: boolean;
  readonly isFiltering: boolean;
  readonly onAdd: (taskId: string) => void;
  readonly onAddSelected: () => void;
  readonly onClearSelection: () => void;
  readonly onSelect: (taskId: string, selected: boolean) => void;
  readonly results: WorkspaceSearchResults;
  readonly selectedIds: ReadonlySet<string>;
};

function WorkspaceContextRail(props: WorkspaceContextRailProps) {
  return (
    <aside className={spacingStyles.cardStack}>
      <WorkspacePanel
        count={props.results.projects.length}
        description="Outcomes stay visible while concrete Tasks enter the plan."
        title="Projects"
      >
        <WorkspaceProjects
          isFiltering={props.isFiltering}
          projects={props.results.projects}
        />
      </WorkspacePanel>
      <WorkspacePanel
        count={props.results.tasks.length}
        description="Select several Tasks, drag one, or add work directly."
        title="Available Tasks"
      >
        <WorkspaceTaskPool
          disabled={props.disabled}
          isFiltering={props.isFiltering}
          onAdd={props.onAdd}
          onAddSelected={props.onAddSelected}
          onClearSelection={props.onClearSelection}
          onSelect={props.onSelect}
          selectedIds={props.selectedIds}
          tasks={props.results.tasks}
        />
      </WorkspacePanel>
      <WorkspacePanel
        count={props.results.inbox.length}
        defaultExpanded={props.results.inbox.length > 0}
        description="Captured thoughts stay visible without becoming planned work."
        title="Inbox"
      >
        <WorkspaceInbox
          inbox={props.results.inbox}
          isFiltering={props.isFiltering}
        />
      </WorkspacePanel>
    </aside>
  );
}

export { WorkspaceContextRail };
