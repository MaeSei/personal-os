import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import type {
  TaskAssignmentInput,
  TaskDetailData,
  TaskWriteInput,
} from "@/features/contracts/TaskFeature";
import { TaskActions } from "@/features/tasks/components/TaskActions";
import { TaskContextSections } from "@/features/tasks/components/TaskContextSections";
import { TaskFuture } from "@/features/tasks/components/TaskFuture";
import { TaskHistory } from "@/features/tasks/components/TaskHistory";
import { TaskOverview } from "@/features/tasks/components/TaskOverview";
import { spacingStyles } from "@/theme/spacing";

type TaskDetailProps = {
  readonly announcement: string;
  readonly data: TaskDetailData;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly onConvert: (outcome: string) => Promise<boolean>;
  readonly onDelete: () => Promise<boolean>;
  readonly onDetach: () => Promise<boolean>;
  readonly onDuplicate: () => Promise<boolean>;
  readonly onMove: (input: TaskAssignmentInput) => Promise<boolean>;
  readonly onUpdate: (input: TaskWriteInput) => Promise<boolean>;
};

function TaskDetail(props: TaskDetailProps) {
  const { data } = props;
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={data.project ? <ButtonLink href={`/projects/${data.project.id}`} variant="secondary">Back to Project</ButtonLink> : <ButtonLink href="/" variant="secondary">Back to Workspace</ButtonLink>}
          description="One place to understand, shape, and move this piece of work."
          eyebrow="Task workspace"
          title={data.task.title}
        />
        {props.error ? <EmptyState description={props.error} status="alert" title="That change was not saved" /> : null}
        <TaskOverview data={data} />
        <TaskActions
          areas={data.areas}
          disabled={props.isSaving}
          onConvert={props.onConvert}
          onDelete={props.onDelete}
          onDetach={props.onDetach}
          onDuplicate={props.onDuplicate}
          onMove={props.onMove}
          onUpdate={props.onUpdate}
          projects={data.projects}
          task={data.task}
        />
        <TaskContextSections dependencies={data.dependencies} notes={data.notes} />
        <TaskHistory entries={data.history} />
        <TaskFuture />
      </div>
      <p aria-live="polite" className="sr-only" role="status">{props.announcement}</p>
    </PageContainer>
  );
}

export { TaskDetail };
