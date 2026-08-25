import type {
  Area,
  InboxProjectInput,
  InboxTaskInput,
  Item,
  ItemId,
  Project,
  Task,
} from "@/domain";

type InboxProcessingData = {
  readonly areas: readonly Area[];
  readonly items: readonly Item[];
  readonly projects: readonly Project[];
};

type ProcessTaskInput = InboxTaskInput & { readonly itemId: ItemId };
type ProcessProjectInput = InboxProjectInput & { readonly itemId: ItemId };

/** Title capture and progressive Inbox triage exposed to feature UI. */
interface InboxFeature {
  addFirstTask(projectId: ItemId, title: string): Promise<Task>;
  capture(title: string): Promise<Item>;
  deleteInboxItem(itemId: ItemId): Promise<void>;
  getInbox(): Promise<readonly Item[]>;
  getProcessingData(): Promise<InboxProcessingData>;
  processAsProject(input: ProcessProjectInput): Promise<Project>;
  processAsReference(itemId: ItemId): Promise<Item>;
  processAsSomeday(itemId: ItemId): Promise<Item>;
  processAsTask(input: ProcessTaskInput): Promise<Task>;
}

export type {
  InboxFeature,
  InboxProcessingData,
  ProcessProjectInput,
  ProcessTaskInput,
};
