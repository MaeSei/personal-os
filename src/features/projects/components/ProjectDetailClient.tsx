"use client";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageStatus } from "@/components/ui/PageStatus";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";
import { AIProjectAssistant } from "@/features/projects/components/AIProjectAssistant";
import { useProjectDetail } from "@/features/projects/hooks/useProjectDetail";
import { useFeatures } from "@/features/FeatureProvider";

type ProjectDetailClientProps = { readonly projectId: string };

function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const { breakdown, projects } = useFeatures();
  const workspace = useProjectDetail(projectId, projects, breakdown);

  if (workspace.error && !workspace.data) {
    return (
      <PageStatus
        action={<Button onClick={workspace.retry} variant="secondary">Try again</Button>}
        description={workspace.error}
        title="This Project is unavailable"
        tone="danger"
      />
    );
  }

  if (workspace.notFound) {
    return (
      <PageStatus
        action={<ButtonLink href="/projects" variant="secondary">All Projects</ButtonLink>}
        description="It may have been removed from this browser."
        title="Project not found"
        tone="danger"
      />
    );
  }

  if (workspace.isLoading || !workspace.data) {
    return (
      <PageStatus
        description="Gathering Tasks, status groups, and dated work."
        title="Preparing the Project"
      />
    );
  }

  return (
    <ProjectDetail
      assistant={
        <AIProjectAssistant
          onAccepted={workspace.reload}
          projectId={projectId}
        />
      }
      announcement={workspace.announcement}
      areas={workspace.data.areas}
      detail={workspace.data.detail}
      error={workspace.error}
      isSaving={workspace.isSaving}
      onBreakDown={workspace.breakDown}
      onCreate={workspace.createTask}
      onCreateMilestone={workspace.createMilestone}
      onCreateNote={workspace.createNote}
      onDelete={workspace.deleteTask}
      onDeleteMilestone={workspace.deleteMilestone}
      onDeleteNote={workspace.deleteNote}
      onGroupTask={workspace.groupTask}
      onLinkProject={workspace.linkRelatedProject}
      onReorder={workspace.reorderTask}
      onSetMilestoneCompleted={workspace.setMilestoneCompleted}
      onSetNotePinned={workspace.setNotePinned}
      onUnlinkProject={workspace.unlinkRelatedProject}
      onUpdate={workspace.updateTask}
      projects={workspace.data.projects}
    />
  );
}

export { ProjectDetailClient };
