import type { BreakdownService } from "./BreakdownService";
import type { ClassificationService } from "./ClassificationService";
import type { ConversationService } from "./ConversationService";
import type { PlanningService } from "./PlanningService";
import type { ReflectionService } from "./ReflectionService";

/** Constructor-injected AI capability set. No provider is selected here. */
interface AIService {
  readonly breakdown: BreakdownService;
  readonly classification: ClassificationService;
  readonly conversation: ConversationService;
  readonly planning: PlanningService;
  readonly reflection: ReflectionService;
}

export type { AIService };
