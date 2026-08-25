"use client";

import { useFeatures } from "@/features/FeatureProvider";
import { Workspace } from "@/features/workspace/components/Workspace";
import { useWorkspace } from "@/features/workspace/hooks/useWorkspace";
import { useRouter } from "next/navigation";

function WorkspaceClient() {
  const { workspace } = useFeatures();
  const state = useWorkspace(workspace);
  const router = useRouter();

  return (
    <Workspace
      announcement={state.announcement}
      data={state.data}
      error={state.error}
      filters={state.filters}
      isFiltering={state.isFiltering}
      isLoading={state.isLoading}
      onArchive={(taskId) => void state.archiveTask(taskId)}
      onFiltersChange={(filters) => void state.applyFilters(filters)}
      onFocus={(taskId) => {
        void state.focusTask(taskId).then((focused) => {
          if (focused) router.push("/focus");
        });
      }}
      onGroup={(taskId, group) => void state.setTaskGroup(taskId, group)}
      onPin={(taskId, pinned) => void state.setTaskPinned(taskId, pinned)}
      onPlace={(taskId, beforeTaskId, group, pinned) =>
        void state.placeTask(taskId, beforeTaskId, group, pinned)
      }
      onReload={() => void state.reload()}
      onRemove={(taskId) => void state.removeTask(taskId)}
      pendingTaskId={state.pendingTaskId}
    />
  );
}

export { WorkspaceClient };
