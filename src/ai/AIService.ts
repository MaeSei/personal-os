import type { BreakdownService } from "./BreakdownService";
import type { BriefingService } from "./BriefingService";
import type { ClassificationService } from "./ClassificationService";
import type { ConversationService } from "./ConversationService";
import type { PlanningService } from "./PlanningService";
import type { ReflectionService } from "./ReflectionService";

/** Constructor-injected AI capability set. No provider is selected here. */
interface AIService {
  readonly breakdown: BreakdownService;
  readonly briefing: BriefingService;
  readonly classification: ClassificationService;
  readonly conversation: ConversationService | null;
  readonly planning: PlanningService | null;
  readonly reflection: ReflectionService;
}

export type { AIService };
