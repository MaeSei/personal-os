import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { ApplicationContainer } from "../src/application/ApplicationContainer";
import { initialAreas, Status, type Area } from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockDailyReviewRepository } from "../src/repositories/MockDailyReviewRepository";
import { MockDailyWrapUpRepository } from "../src/repositories/MockDailyWrapUpRepository";
import { MockCalendarRepository } from "../src/repositories/MockCalendarRepository";
import { MockDayPlanRepository } from "../src/repositories/MockDayPlanRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";
import type {
  RepositoryFactory,
  RepositorySet,
} from "../src/repositories/RepositoryFactory";

class AreaMemoryRepository implements AreaRepository {
  constructor(private areas: readonly Area[] = initialAreas) {}

  get() {
    return Promise.resolve(this.areas);
  }

  save(areas: readonly Area[]) {
    this.areas = areas;
    return Promise.resolve();
  }
}

class MemoryRepositoryFactory implements RepositoryFactory {
  calls = 0;

  create(): RepositorySet {
    this.calls += 1;
    return {
      areas: new AreaMemoryRepository(),
      calendars: new MockCalendarRepository(),
      items: new MockItemRepository(),
      plans: new MockDayPlanRepository(),
      reviews: new MockDailyReviewRepository(),
      wrapUps: new MockDailyWrapUpRepository(),
    };
  }
}

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.tsx?$/.test(entry.name) ? [target] : [];
  });
}

test("ApplicationContainer exposes feature contracts and hides construction", async () => {
  const repositoryFactory = new MemoryRepositoryFactory();
  const container = new ApplicationContainer(repositoryFactory, {
    calendarProvider: null,
    calendarTokenCipher: null,
    createId: () => "captured-item",
    missionControlContext: {
      locale: "en-GB",
      now: new Date("2026-08-24T08:00:00.000Z"),
      timeZone: "Europe/Stockholm",
      userName: "Maike",
    },
  });

  const captured = await container.features.inbox.capture("Keep this thought");

  assert.equal(repositoryFactory.calls, 1);
  assert.equal(captured.status, Status.Inbox);
  assert.deepEqual(Object.keys(container.features).sort(), [
    "areas",
    "assistant",
    "breakdown",
    "calendar",
    "focus",
    "inbox",
    "missionControl",
    "planner",
    "projects",
    "review",
    "tasks",
    "workspace",
    "wrapUp",
  ]);
  assert.equal("repositories" in container, false);
  assert.equal("services" in container, false);
});

test("feature UI imports neither application implementations nor repositories", () => {
  const uiFiles = [
    ...sourceFiles(path.join(process.cwd(), "src/features")),
    ...sourceFiles(path.join(process.cwd(), "src/components")),
  ];
  const violations = uiFiles.filter((file) => {
    const source = readFileSync(file, "utf8");
    return /from\s+["'](?:@\/(?:application|repositories)(?:\/|["'])|(?:\.\.\/)+(?:application|repositories)(?:\/|["']))/.test(
      source,
    );
  });

  assert.deepEqual(violations, []);
});

test("PostgreSQL repositories are instantiated only by their server factory", () => {
  const sourceRoot = path.join(process.cwd(), "src");
  const instantiations = sourceFiles(sourceRoot).filter((file) => {
    const source = readFileSync(file, "utf8");
    return /new Prisma(?:Area|Calendar|Item|DailyReview|DailyWrapUp|DayPlan)Repository\(/.test(source);
  });

  assert.deepEqual(
    instantiations.map((file) => path.relative(process.cwd(), file)),
    ["src/repositories/PrismaRepositoryFactory.ts"],
  );
});

test("the runtime composition root selects PostgreSQL persistence", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/application/container.ts"),
    "utf8",
  );

  assert.match(source, /new PrismaRepositoryFactory\(\)/);
  assert.doesNotMatch(source, /LocalStorage/);
});

test("Planner depends on the CalendarProvider port, never a concrete adapter", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/application/PlannerService.ts"),
    "utf8",
  );

  assert.match(source, /CalendarProvider/);
  assert.doesNotMatch(source, /GoogleCalendarProvider|ICSProvider|MockCalendarProvider/);
});
