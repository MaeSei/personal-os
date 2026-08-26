# AI service layer

Atlas AI is an optional, server-only proposal layer. It follows one authority
rule:

```text
AI proposes
  -> Atlas validates
  -> user selects or edits
  -> application service writes
  -> repository persists
```

`src/ai` owns provider-neutral capability interfaces. The current optional
adapter calls the OpenAI Responses API through a structured-output gateway.
Provider code receives a capability-specific evidence object and JSON Schema;
it receives no repository, database connection, application command, Calendar
write access, or browser credential.

## Implemented capabilities

- `BreakdownService` proposes Milestones, Tasks, duration and energy estimates,
  and dependency references for one Project.
- `ClassificationService` proposes existing Area and Project IDs, duration,
  energy, and Contexts for one Inbox Item.
- `BriefingService` produces the Daily Coach and Executive Briefing.
- `ReflectionService` phrases evidence-backed reflection, learning, and
  suggestions from deterministic history.
- `ConversationService` and `PlanningService` remain unimplemented ports.

`AIService` is dependency-injected only in the server composition root. When
`OPENAI_API_KEY` or `OPENAI_MODEL` is absent, Atlas reports AI as unavailable
and preserves every manual workflow.

## Safety boundaries

- OpenAI calls use Structured Outputs, `store: false`, no tools, and a timeout.
- Every response is treated as unknown input and validated again in Atlas.
- Area, Project, Milestone, Task, and dependency references must exist in the
  supplied context.
- Confidence is constrained to `0–1`; estimates are constrained to Atlas
  limits.
- A Project proposal is stale after the Project changes.
- Accepting selected Project suggestions performs one aggregate repository
  save. Accepting none performs no write.
- Inbox AI only prefills the existing triage form. Filing still requires the
  existing **Create Task** command.
- Briefing and Reflection outputs have no write method.
- Every Executive recommendation includes Calendar, Project, Pattern, current
  energy, and deadline evidence selected from a server-built allow-list. Atlas
  rejects invented evidence; an explicit absence is still visible evidence.

The adapter follows the official [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
contract for structured JSON responses. Model selection is explicit in the
environment so Atlas never changes models silently.

## Data flow

```text
Feature UI
  -> AssistantFeature
  -> AssistantService
       -> repositories (read scoped evidence)
       -> deterministic Analytics / Pattern / Calendar services
       -> AI capability interface
            -> OpenAIResponsesGateway
       -> Atlas output validation
  -> non-canonical preview
  -> explicit user approval
  -> AssistantService or existing Inbox command
  -> repository
```

No AI proposal is stored as canonical work. The manual Project breakdown,
Inbox triage, Workspace, Planner, and Review paths remain complete without AI.
