# Atlas Assistant experiences

## Project breakdown

The Project Dashboard retains manual rapid entry and adds an optional AI
assistant. **Break this down** generates a preview grouped into Milestones and
Tasks. Each row shows its reason, confidence, duration, energy, and dependency
count. The user may accept all, any subset, or none.

Only accepted suggestions become Items. Dependencies are stored as explicit
Task reference tags and are visible in Task Detail. A changed Project
invalidates an older preview, preventing stale acceptance.

## Inbox AI

**Suggest fields** considers only the current Inbox Item and summaries of
existing Areas and Projects. It displays a confidence score and never files the
Item. **Review and approve** opens the normal Task form with suggested values;
the user may edit every field and must still choose **Create Task**.

## Executive Briefing

`/briefing` is a report, not a chat surface. It combines current Review,
read-only Calendar, Projects, Tasks, deadlines, deterministic Analytics and
Patterns, and the optional structured Memory port. It returns Greeting,
Attention Budget, Observations, Risks, Opportunities, Workspace suggestions,
Time Blocks, Quick Wins, and Deep Work.

Every suggestion exposes five evidence categories: Calendar, deadlines,
current energy, historical Patterns, and Projects. The page cannot add a Task,
change Today, or schedule a Time Block. The application builds the permitted
evidence references before calling the provider and rejects any reference that
was not present in that catalog.

## Reflection Coach

`/reflection` uses Analytics, Patterns, historical Daily Reviews, Task outcomes,
and Planning/Wrap-Up history. It separates Reflection, Learning, and optional
Suggestions, each with confidence and visible evidence. It does not change a
Review, Project, Workspace, or future plan.

## Failure and empty states

AI is optional. Missing configuration hides Inbox assistance, disables Project
and briefing generation, and explains that the manual path remains available.
Provider timeout, refusal, malformed output, invented references, or stale
context returns an error without persisting anything.
