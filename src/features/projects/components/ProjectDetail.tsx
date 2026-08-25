import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Area, Project, ProjectDetail as Detail } from "@/domain";
import type { TaskWriteInput } from "@/features/contracts/ProjectFeature";
import { ProjectHero } from "@/features/projects/components/ProjectHero";
import { ProjectTaskSection } from "@/features/projects/components/ProjectTaskSection";
import { ProjectTimeline } from "@/features/projects/components/ProjectTimeline";
import { TaskCollection } from "@/features/projects/components/TaskCollection";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type ProjectDetailProps = {
  readonly announcement: string;
  readonly areas: readonly Area[];
  readonly detail: Detail;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly onBreakDown: (titles: readonly string[]) => Promise<boolean>;
  readonly onCreate: (input: TaskWriteInput) => Promise<boolean>;
  readonly onDelete: (taskId: string) => Promise<boolean>;
  readonly onReorder: (taskId: string, direction: "down" | "up") => Promise<boolean>;
  readonly onUpdate: (taskId: string, input: TaskWriteInput) => Promise<boolean>;
  readonly projects: readonly Project[];
};

function ProjectDetail(props: ProjectDetailProps) {
  const { detail } = props;

  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={
            <div className={spacingStyles.cluster}>
              <ButtonLink href="/projects" variant="secondary">All Projects</ButtonLink>
              <ButtonLink href="/" variant="ghost">Mission Control</ButtonLink>
            </div>
          }
          description="Outcome, hierarchy, timing, and the work that needs attention."
          eyebrow="Project workspace"
          title={detail.project.title}
        />
        <ProjectHero detail={detail} />
        <ProjectTaskSection
          areas={props.areas}
          disabled={props.isSaving}
          error={props.error}
          onBreakDown={props.onBreakDown}
          onCreate={props.onCreate}
          onDelete={props.onDelete}
          onReorder={props.onReorder}
          onUpdate={props.onUpdate}
          project={detail.project}
          projects={props.projects}
          tasks={detail.taskRoots}
        />
        <ProjectTimeline entries={detail.timeline} />
        <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
          <TaskCollection description="Work that cannot move until an obstacle is resolved." emptyMessage="Nothing is blocked." id="blocked-project-tasks" tasks={detail.blockedTasks} title="Blocked Tasks" />
          <TaskCollection description="Work waiting on another person, event, or input." emptyMessage="Nothing is waiting." id="waiting-project-tasks" tasks={detail.waitingTasks} title="Waiting Tasks" />
          <TaskCollection description="Finished work retained as Project history." emptyMessage="Completed Tasks will collect here." id="completed-project-tasks" tasks={detail.completedTasks} title="Completed Tasks" />
          <TaskCollection description="Open work without an intended calendar day." emptyMessage="Every open Task has a schedule." id="unscheduled-project-tasks" tasks={detail.unscheduledTasks} title="Unscheduled Tasks" />
        </div>
      </div>
      <p aria-live="polite" className="sr-only" role="status">{props.announcement}</p>
    </PageContainer>
  );
}

export { ProjectDetail };
