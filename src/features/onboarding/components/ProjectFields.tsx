import type { Area, AreaId, EnergyCost } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectFieldsProps = {
  areas: readonly Area[];
  energyLevel: EnergyCost;
  onAreaChange: (areaId: AreaId) => void;
  onEnergyLevelChange: (energyLevel: EnergyCost) => void;
  onNextActionChange: (nextAction: string) => void;
  onOutcomeChange: (outcome: string) => void;
  onTitleChange: (title: string) => void;
  projectAreaId: AreaId | null;
  projectNextAction: string;
  projectOutcome: string;
  projectTitle: string;
};

const energyLevels: readonly EnergyCost[] = [1, 2, 3, 4, 5];

function ProjectFields({
  areas,
  energyLevel,
  onAreaChange,
  onEnergyLevelChange,
  onNextActionChange,
  onOutcomeChange,
  onTitleChange,
  projectAreaId,
  projectNextAction,
  projectOutcome,
  projectTitle,
}: ProjectFieldsProps) {
  const fieldClassName = cn(
    "w-full border p-card-compact",
    radiusStyles.control,
    typographyStyles.body,
    colorStyles.field,
    colorStyles.focusRing,
    motionStyles.field,
  );

  return (
    <>
      <div className={spacingStyles.detailStack}>
        <label className={typographyStyles.cardTitle} htmlFor="project-outcome">
          Outcome
        </label>
        <p
          className={cn(
            typographyStyles.description,
            colorStyles.text.muted,
          )}
          id="project-outcome-description"
        >
          What will be observably different when this Project is finished?
        </p>
        <textarea
          aria-describedby="project-outcome-description"
          autoFocus
          className={cn(fieldClassName, "resize-y")}
          id="project-outcome"
          maxLength={500}
          onChange={(event) => onOutcomeChange(event.target.value)}
          placeholder="Atlas available from every device."
          required
          rows={3}
          value={projectOutcome}
        />
      </div>
      <div className={spacingStyles.detailStack}>
        <label className={typographyStyles.cardTitle} htmlFor="project-title">
          Project title
        </label>
        <input
          className={fieldClassName}
          id="project-title"
          maxLength={200}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Deploy Atlas"
          required
          value={projectTitle}
        />
      </div>
      <div className={spacingStyles.detailStack}>
        <label
          className={typographyStyles.cardTitle}
          htmlFor="project-next-action"
        >
          First next action
        </label>
        <input
          className={fieldClassName}
          id="project-next-action"
          maxLength={200}
          onChange={(event) => onNextActionChange(event.target.value)}
          placeholder="Verify the production deployment"
          required
          value={projectNextAction}
        />
      </div>
      <div className={spacingStyles.detailStack}>
        <label className={typographyStyles.cardTitle} htmlFor="project-area">
          Area
        </label>
        <select
          className={fieldClassName}
          id="project-area"
          onChange={(event) => onAreaChange(event.target.value)}
          required
          value={projectAreaId ?? ""}
        >
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.icon} {area.title}
            </option>
          ))}
        </select>
      </div>
      <div className={spacingStyles.detailStack}>
        <label className={typographyStyles.cardTitle} htmlFor="project-energy">
          Energy level
        </label>
        <select
          className={fieldClassName}
          id="project-energy"
          onChange={(event) =>
            onEnergyLevelChange(Number(event.target.value) as EnergyCost)
          }
          value={energyLevel}
        >
          {energyLevels.map((level) => (
            <option key={level} value={level}>
              {level} of 5
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export { ProjectFields, type ProjectFieldsProps };
