"use client";

import { useState } from "react";

import { fieldClassName, fieldGroupClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { Project } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type RelatedProjectsProps = {
  readonly disabled: boolean;
  readonly onLink: (projectId: string) => Promise<boolean>;
  readonly onUnlink: (projectId: string) => Promise<boolean>;
  readonly project: Project;
  readonly projects: readonly Project[];
  readonly relatedProjects: readonly Project[];
};

function RelatedProjects(props: RelatedProjectsProps) {
  const relatedIds = new Set(props.relatedProjects.map((project) => project.id));
  const available = props.projects.filter(
    (project) => project.id !== props.project.id && !relatedIds.has(project.id),
  );
  const [selectedId, setSelectedId] = useState(available[0]?.id ?? "");

  async function link() {
    if (!selectedId) return;
    if (await props.onLink(selectedId)) setSelectedId("");
  }

  return (
    <Section
      description="Nearby outcomes whose context or progress matters here."
      id="related-projects"
      title="Related Projects"
    >
      {available.length > 0 ? (
        <Card tone="subtle">
          <div className={spacingStyles.cardStack}>
            <div className={fieldGroupClassName}>
              <label className={labelClassName} htmlFor="related-project">Project</label>
              <select
                className={fieldClassName}
                id="related-project"
                onChange={(event) => setSelectedId(event.target.value)}
                value={selectedId}
              >
                <option value="">Choose a Project</option>
                {available.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </div>
            <div>
              <Button disabled={props.disabled || !selectedId} onClick={() => void link()} size="sm">
                Add relationship
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
      {props.relatedProjects.length === 0 ? (
        <EmptyState
          description="Connect another Project only when the relationship adds useful context."
          title="No related Projects"
        />
      ) : (
        <Card padding="none">
          <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
            {props.relatedProjects.map((project) => (
              <li className={spacingStyles.item} key={project.id}>
                <div className="flex w-full items-start justify-between gap-card">
                  <div className={spacingStyles.detailStack}>
                    <a
                      className={cn(typographyStyles.cardTitle, colorStyles.focusRing)}
                      href={`/projects/${project.id}`}
                    >
                      {project.title}
                    </a>
                    <p className={cn(typographyStyles.description, colorStyles.text.muted)}>{project.outcome}</p>
                  </div>
                  <Button
                    aria-label={`Remove relationship with ${project.title}`}
                    disabled={props.disabled}
                    onClick={() => void props.onUnlink(project.id)}
                    size="sm"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}

export { RelatedProjects };
