# AI service layer

`src/ai` defines future AI capabilities as TypeScript interfaces only. It does
not connect a model, choose a provider, store credentials, contain prompts, or
participate in runtime composition.

```text
AIService
  -> ConversationService
  -> ClassificationService
  -> PlanningService
  -> ReflectionService
  -> BreakdownService
```

`AIService` is an injected capability set. Each child interface accepts a
structured request and returns suggestions with confidence and explanation.
None exposes repository writes or application commands, so future AI output
must cross a separate explicit user-acceptance boundary before Atlas data can
change.

The namespace deliberately separates `src/ai/PlanningService` from the current
deterministic `src/application/PlannerService`, and `src/ai/BreakdownService`
from the current manual breakdown implementation. No fallback implementation
was added: deterministic Analytics, Patterns, and Recommendations remain fully
independent of this optional boundary.
