import type { Project } from "./Project";

type AreaId = string;
type AreaColor = "amber" | "green" | "neutral";

type Area = {
  readonly color: AreaColor;
  readonly description: string;
  readonly icon: string;
  readonly id: AreaId;
  readonly title: string;
};

type AreaBound = {
  readonly areaId: AreaId | null;
};

type AreaProjectGroup = {
  readonly area: Area;
  readonly projects: readonly Project[];
};

const areaColors: readonly AreaColor[] = ["amber", "green", "neutral"];

function createArea(area: Area): Area {
  const id = area.id.trim();
  const title = area.title.trim();
  const icon = area.icon.trim();
  const description = area.description.trim();

  if (!id || !title || !icon || !description) {
    throw new Error("An Area requires an id, title, icon, and description.");
  }

  if (!areaColors.includes(area.color)) {
    throw new Error("An Area requires a supported color.");
  }

  return { ...area, description, icon, id, title };
}

const initialAreas: readonly Area[] = [
  createArea({
    color: "green",
    description: "Professional responsibilities and outcomes.",
    icon: "💼",
    id: "work",
    title: "Work",
  }),
  createArea({
    color: "neutral",
    description: "The place and systems that support daily life.",
    icon: "🏠",
    id: "home",
    title: "Home",
  }),
  createArea({
    color: "amber",
    description: "Travel, maintenance, and life on the road.",
    icon: "🚐",
    id: "rv",
    title: "RV",
  }),
  createArea({
    color: "green",
    description: "Physical and mental wellbeing.",
    icon: "♥",
    id: "health",
    title: "Health",
  }),
  createArea({
    color: "neutral",
    description: "People, relationships, and shared responsibilities.",
    icon: "👥",
    id: "family",
    title: "Family",
  }),
  createArea({
    color: "green",
    description: "Skills, study, and curiosity.",
    icon: "📚",
    id: "learning",
    title: "Learning",
  }),
  createArea({
    color: "neutral",
    description: "Growth, commitments, and time that is yours.",
    icon: "●",
    id: "personal",
    title: "Personal",
  }),
];

function isArea(value: unknown): value is Area {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const area = value as Record<string, unknown>;

  return (
    typeof area.id === "string" &&
    area.id.trim().length > 0 &&
    typeof area.title === "string" &&
    area.title.trim().length > 0 &&
    typeof area.icon === "string" &&
    area.icon.trim().length > 0 &&
    typeof area.description === "string" &&
    area.description.trim().length > 0 &&
    areaColors.includes(area.color as AreaColor)
  );
}

function getInitialArea(value: string): Area | null {
  const normalized = value.trim().toLowerCase();

  return (
    initialAreas.find(
      (area) =>
        area.id.toLowerCase() === normalized ||
        area.title.toLowerCase() === normalized,
    ) ?? null
  );
}

/** Returns whether an Item belongs to the requested Area. */
function belongsToArea(item: AreaBound, area: Pick<Area, "id">): boolean {
  return item.areaId === area.id;
}

/** Groups Projects without leaking relationship logic into Mission Control. */
function groupProjectsByArea(
  areas: readonly Area[],
  projects: readonly Project[],
): readonly AreaProjectGroup[] {
  return areas.map((area) => ({
    area,
    projects: projects.filter((project) => belongsToArea(project, area)),
  }));
}

export {
  belongsToArea,
  createArea,
  getInitialArea,
  groupProjectsByArea,
  initialAreas,
  isArea,
};
export type { Area, AreaBound, AreaColor, AreaId, AreaProjectGroup };
