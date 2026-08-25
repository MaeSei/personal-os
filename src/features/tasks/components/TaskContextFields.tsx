import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { builtInContexts } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskContextFieldsProps = {
  readonly contexts: readonly string[];
  readonly idPrefix: string;
};

const builtInKeys = new Set(
  builtInContexts.map((context) => context.toLocaleLowerCase()),
);

function TaskContextFields({ contexts, idPrefix }: TaskContextFieldsProps) {
  const selected = new Set(
    contexts.map((context) => context.toLocaleLowerCase()),
  );
  const custom = contexts.filter(
    (context) => !builtInKeys.has(context.toLocaleLowerCase()),
  );

  return (
    <fieldset className={cn(spacingStyles.cardStack, "@md:col-span-2")}>
      <legend className={labelClassName}>Contexts</legend>
      <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
        Choose every place or tool where this Task can be completed.
      </p>
      <div className="grid gap-detail @sm:grid-cols-2 @2xl:grid-cols-4">
        {builtInContexts.map((context) => (
          <label
            className={cn(
              "flex min-h-control-md items-center gap-cluster border border-border bg-surface-subtle px-card-compact",
              radiusStyles.control,
            )}
            htmlFor={`${idPrefix}-context-${context.toLocaleLowerCase()}`}
            key={context}
          >
            <input
              className={cn(
                "size-4 shrink-0 accent-accent",
                colorStyles.focusRing,
              )}
              defaultChecked={selected.has(context.toLocaleLowerCase())}
              id={`${idPrefix}-context-${context.toLocaleLowerCase()}`}
              name="contexts"
              type="checkbox"
              value={context}
            />
            <span className={typographyStyles.metricLabel}>{context}</span>
          </label>
        ))}
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`${idPrefix}-custom-contexts`}>
          Custom contexts
        </label>
        <input
          className={fieldClassName}
          defaultValue={custom.join(", ")}
          id={`${idPrefix}-custom-contexts`}
          maxLength={500}
          name="customContexts"
          placeholder="Workshop, garden, client site"
        />
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          Separate multiple custom contexts with commas.
        </p>
      </div>
    </fieldset>
  );
}

export { TaskContextFields, type TaskContextFieldsProps };
