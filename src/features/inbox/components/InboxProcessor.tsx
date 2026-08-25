import type {
  ProcessProjectInput,
  ProcessTaskInput,
} from "@/features/contracts/InboxFeature";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Area, Item, Project } from "@/domain";
import { InboxProcessingItem } from "@/features/inbox/components/InboxProcessingItem";
import { ProjectFirstTaskPrompt } from "@/features/inbox/components/ProjectFirstTaskPrompt";

type InboxProcessorProps = {
  readonly addFirstTask: (title: string) => Promise<boolean>;
  readonly areas: readonly Area[];
  readonly deleteItem: (itemId: string) => Promise<boolean>;
  readonly error: string | null;
  readonly finishProject: () => void;
  readonly isLoading: boolean;
  readonly isProcessing: boolean;
  readonly items: readonly Item[];
  readonly processProject: (input: ProcessProjectInput) => Promise<boolean>;
  readonly processReference: (itemId: string) => Promise<boolean>;
  readonly processSomeday: (itemId: string) => Promise<boolean>;
  readonly processTask: (input: ProcessTaskInput) => Promise<boolean>;
  readonly projectFollowUp: Project | null;
  readonly projects: readonly Project[];
};

function InboxProcessor(props: InboxProcessorProps) {
  if (props.isLoading) {
    return (
      <EmptyState
        description="Reading thoughts saved in this browser."
        status="status"
        title="Loading your Inbox"
      />
    );
  }

  if (props.projectFollowUp) {
    return (
      <ProjectFirstTaskPrompt
        disabled={props.isProcessing}
        error={props.error}
        onAdd={props.addFirstTask}
        onLater={props.finishProject}
        project={props.projectFollowUp}
      />
    );
  }

  const item = props.items[0];

  if (!item) {
    return (
      <EmptyState
        description={
          props.error
            ? "Your saved thoughts have not been changed."
            : "Everything has a place. Capture anything you do not want to hold in your head."
        }
        status={props.error ? "alert" : undefined}
        title={props.error ?? "Your Inbox is clear"}
      />
    );
  }

  return (
    <InboxProcessingItem
      areas={props.areas}
      deleteItem={props.deleteItem}
      error={props.error}
      isProcessing={props.isProcessing}
      item={item}
      key={item.id}
      processProject={props.processProject}
      processReference={props.processReference}
      processSomeday={props.processSomeday}
      processTask={props.processTask}
      projects={props.projects}
      remaining={props.items.length}
    />
  );
}

export { InboxProcessor, type InboxProcessorProps };
