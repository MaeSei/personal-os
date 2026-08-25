import { NextResponse, type NextRequest } from "next/server";

import { applicationContainer } from "@/application/container";
import type {
  CompleteOnboardingInput,
  ProjectMilestoneInput,
  TaskWriteInput,
} from "@/features/contracts/ProjectFeature";
import type {
  ProcessProjectInput,
  ProcessTaskInput,
} from "@/features/contracts/InboxFeature";
import type { BreakdownRequest } from "@/features/contracts/BreakdownFeature";
import type {
  TimeBlockUpdateInput,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";
import type {
  TaskAssignmentInput,
  TaskWriteInput as TaskDetailWriteInput,
} from "@/features/contracts/TaskFeature";
import type { WorkspacePlaceInput } from "@/features/contracts/WorkspaceFeature";
import type {
  DailyReviewInput,
  DailyWrapUpReflection,
  ProjectFilters,
  WorkspaceTaskFilters,
} from "@/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FeatureRequest = {
  readonly args?: readonly unknown[];
  readonly feature?: unknown;
  readonly operation?: unknown;
};

function arg<T>(args: readonly unknown[], index: number): T {
  return args[index] as T;
}

async function dispatch(request: FeatureRequest): Promise<unknown> {
  const { features } = applicationContainer;
  const args = request.args ?? [];

  switch (`${request.feature}.${request.operation}`) {
    case "areas.getAreas":
      return features.areas.getAreas();
    case "areas.saveAreas":
      return features.areas.saveAreas(arg(args, 0));
    case "breakdown.breakDown":
      return features.breakdown.breakDown(arg<BreakdownRequest>(args, 0));
    case "calendar.disconnect":
      return features.calendar.disconnect();
    case "calendar.getConnection":
      return features.calendar.getConnection();
    case "calendar.refresh":
      return features.calendar.refresh();
    case "calendar.selectCalendars":
      return features.calendar.selectCalendars(arg<readonly string[]>(args, 0));
    case "focus.addChecklistItem":
      return features.focus.addChecklistItem(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "focus.completeItem":
      return features.focus.completeItem(arg<string>(args, 0));
    case "focus.loadFocusSession":
      return features.focus.loadFocusSession();
    case "focus.loadFocusMode":
      return features.focus.loadFocusMode();
    case "focus.pauseSession":
      return features.focus.pauseSession(arg<string>(args, 0));
    case "focus.removeChecklistItem":
      return features.focus.removeChecklistItem(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "focus.resumeSession":
      return features.focus.resumeSession(arg<string>(args, 0));
    case "focus.setChecklistItemCompleted":
      return features.focus.setChecklistItemCompleted(
        arg<string>(args, 0),
        arg<string>(args, 1),
        arg<boolean>(args, 2),
      );
    case "focus.switchTask":
      return features.focus.switchTask(arg<string>(args, 0));
    case "focus.updateNotes":
      return features.focus.updateNotes(
        arg<string>(args, 0),
        arg<string | null>(args, 1),
      );
    case "inbox.addFirstTask":
      return features.inbox.addFirstTask(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "inbox.capture":
      return features.inbox.capture(arg<string>(args, 0));
    case "inbox.deleteInboxItem":
      return features.inbox.deleteInboxItem(arg<string>(args, 0));
    case "inbox.getInbox":
      return features.inbox.getInbox();
    case "inbox.getProcessingData":
      return features.inbox.getProcessingData();
    case "inbox.processAsProject":
      return features.inbox.processAsProject(arg<ProcessProjectInput>(args, 0));
    case "inbox.processAsReference":
      return features.inbox.processAsReference(arg<string>(args, 0));
    case "inbox.processAsSomeday":
      return features.inbox.processAsSomeday(arg<string>(args, 0));
    case "inbox.processAsTask":
      return features.inbox.processAsTask(arg<ProcessTaskInput>(args, 0));
    case "missionControl.loadMissionControl":
      return features.missionControl.loadMissionControl();
    case "planner.createTimeBlock":
      return features.planner.createTimeBlock(arg<TimeBlockWriteInput>(args, 0));
    case "planner.deleteTimeBlock":
      return features.planner.deleteTimeBlock(arg<string>(args, 0));
    case "planner.discardDraft":
      return features.planner.discardDraft();
    case "planner.duplicateTimeBlock":
      return features.planner.duplicateTimeBlock(
        arg<string>(args, 0),
        arg<number>(args, 1),
      );
    case "planner.linkProjectToTimeBlock":
      return features.planner.linkProjectToTimeBlock(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "planner.linkTaskToTimeBlock":
      return features.planner.linkTaskToTimeBlock(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "planner.loadPlanner":
      return features.planner.loadPlanner();
    case "planner.mergeTimeBlocks":
      return features.planner.mergeTimeBlocks(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "planner.moveTask":
      return features.planner.moveTask(
        arg<string>(args, 0),
        arg<"down" | "up">(args, 1),
      );
    case "planner.moveTimeBlock":
      return features.planner.moveTimeBlock(
        arg<string>(args, 0),
        arg<number>(args, 1),
      );
    case "planner.placeTask":
      return features.planner.placeTask(
        arg<string>(args, 0),
        arg<string | null | undefined>(args, 1),
      );
    case "planner.placeTasks":
      return features.planner.placeTasks(arg<readonly string[]>(args, 0));
    case "planner.removeTask":
      return features.planner.removeTask(arg<string>(args, 0));
    case "planner.resizeTimeBlock":
      return features.planner.resizeTimeBlock(
        arg<string>(args, 0),
        arg<number>(args, 1),
      );
    case "planner.scheduleTaskInSlot":
      return features.planner.scheduleTaskInSlot(
        arg<string>(args, 0),
        arg<number>(args, 1),
      );
    case "planner.saveDraft":
      return features.planner.saveDraft();
    case "planner.setTimeBlockLocked":
      return features.planner.setTimeBlockLocked(
        arg<string>(args, 0),
        arg<boolean>(args, 1),
      );
    case "planner.splitTimeBlock":
      return features.planner.splitTimeBlock(
        arg<string>(args, 0),
        arg<number>(args, 1),
      );
    case "planner.startDay":
      return features.planner.startDay();
    case "planner.unlinkProjectFromTimeBlock":
      return features.planner.unlinkProjectFromTimeBlock(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "planner.unlinkTaskFromTimeBlock":
      return features.planner.unlinkTaskFromTimeBlock(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "planner.unscheduleTask":
      return features.planner.unscheduleTask(arg<string>(args, 0));
    case "planner.updateTimeBlock":
      return features.planner.updateTimeBlock(
        arg<string>(args, 0),
        arg<TimeBlockUpdateInput>(args, 1),
      );
    case "projects.completeOnboarding":
      return features.projects.completeOnboarding(
        arg<CompleteOnboardingInput>(args, 0),
      );
    case "projects.createMilestone":
      return features.projects.createMilestone(
        arg<string>(args, 0),
        arg<ProjectMilestoneInput>(args, 1),
      );
    case "projects.createNote":
      return features.projects.createNote(
        arg<string>(args, 0),
        arg<string>(args, 1),
        arg<boolean>(args, 2),
      );
    case "projects.createTask":
      return features.projects.createTask(arg<TaskWriteInput>(args, 0));
    case "projects.createTasks":
      return features.projects.createTasks(
        arg<readonly TaskWriteInput[]>(args, 0),
      );
    case "projects.deleteTask":
      return features.projects.deleteTask(arg<string>(args, 0));
    case "projects.deleteMilestone":
      return features.projects.deleteMilestone(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "projects.deleteNote":
      return features.projects.deleteNote(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "projects.getProjects":
      return features.projects.getProjects();
    case "projects.loadOverview":
      return features.projects.loadOverview(arg<ProjectFilters>(args, 0));
    case "projects.loadProject":
      return features.projects.loadProject(arg<string>(args, 0));
    case "projects.groupTask":
      return features.projects.groupTask(
        arg<string>(args, 0),
        arg<string>(args, 1),
        arg<string | null>(args, 2),
      );
    case "projects.linkRelatedProject":
      return features.projects.linkRelatedProject(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "projects.reorderTask":
      return features.projects.reorderTask(
        arg<string>(args, 0),
        arg<string>(args, 1),
        arg<"down" | "up">(args, 2),
      );
    case "projects.updateTask":
      return features.projects.updateTask(
        arg<string>(args, 0),
        arg<TaskWriteInput>(args, 1),
      );
    case "projects.setMilestoneCompleted":
      return features.projects.setMilestoneCompleted(
        arg<string>(args, 0),
        arg<string>(args, 1),
        arg<boolean>(args, 2),
      );
    case "projects.setNotePinned":
      return features.projects.setNotePinned(
        arg<string>(args, 0),
        arg<string>(args, 1),
        arg<boolean>(args, 2),
      );
    case "projects.unlinkRelatedProject":
      return features.projects.unlinkRelatedProject(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "review.completeReview":
      return features.review.completeReview(arg<DailyReviewInput>(args, 0));
    case "review.getLatestReview":
      return features.review.getLatestReview();
    case "review.getReviewHistory":
      return features.review.getReviewHistory();
    case "tasks.convertToProject":
      return features.tasks.convertToProject(
        arg<string>(args, 0),
        arg<string>(args, 1),
      );
    case "tasks.deleteTask":
      return features.tasks.deleteTask(arg<string>(args, 0));
    case "tasks.detachFromProject":
      return features.tasks.detachFromProject(arg<string>(args, 0));
    case "tasks.duplicateTask":
      return features.tasks.duplicateTask(arg<string>(args, 0));
    case "tasks.loadTask":
      return features.tasks.loadTask(arg<string>(args, 0));
    case "tasks.moveTask":
      return features.tasks.moveTask(
        arg<string>(args, 0),
        arg<TaskAssignmentInput>(args, 1),
      );
    case "tasks.updateTask":
      return features.tasks.updateTask(
        arg<string>(args, 0),
        arg<TaskDetailWriteInput>(args, 1),
      );
    case "workspace.archiveTask":
      return features.workspace.archiveTask(arg<string>(args, 0));
    case "workspace.focusTask":
      return features.workspace.focusTask(arg<string>(args, 0));
    case "workspace.loadWorkspace":
      return features.workspace.loadWorkspace(
        arg<WorkspaceTaskFilters | undefined>(args, 0),
      );
    case "workspace.placeTask":
      return features.workspace.placeTask(arg<WorkspacePlaceInput>(args, 0));
    case "workspace.removeTask":
      return features.workspace.removeTask(arg<string>(args, 0));
    case "workspace.setTaskGroup":
      return features.workspace.setTaskGroup(
        arg<string>(args, 0),
        arg<string | null>(args, 1),
      );
    case "workspace.setTaskPinned":
      return features.workspace.setTaskPinned(
        arg<string>(args, 0),
        arg<boolean>(args, 1),
      );
    case "wrapUp.completeWrapUp":
      return features.wrapUp.completeWrapUp(
        arg<DailyWrapUpReflection>(args, 0),
      );
    case "wrapUp.loadWrapUp":
      return features.wrapUp.loadWrapUp();
    default:
      throw new Error("Unsupported Atlas feature operation.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: unknown = await request.json();

    if (typeof payload !== "object" || payload === null) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    return NextResponse.json(await dispatch(payload as FeatureRequest));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Atlas request failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
