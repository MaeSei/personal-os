"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import { fieldClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { isEditableTarget } from "@/lib/dom";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspaceSearchProps = {
  readonly onChange: (query: string) => void;
  readonly query: string;
  readonly resultCount: number;
};

function WorkspaceSearch({ onChange, query, resultCount }: WorkspaceSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: globalThis.KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.key !== "/" ||
        isEditableTarget(event.target)
      ) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      onChange("");
    }
  }

  return (
    <div className="grid items-end gap-card sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className={spacingStyles.detailStack}>
        <label className={labelClassName} htmlFor="planning-workspace-search">
          Search workspace
        </label>
        <div className="flex items-center gap-detail">
          <input
            aria-keyshortcuts="/ Escape"
            className={fieldClassName}
            id="planning-workspace-search"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Projects, Tasks, or Inbox"
            ref={inputRef}
            type="search"
            value={query}
          />
          {query ? (
            <Button onClick={() => onChange("")} size="md" variant="ghost">
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      <p
        aria-live="polite"
        className={cn(typographyStyles.description, colorStyles.text.muted)}
      >
        {query.trim()
          ? `${resultCount} matching ${resultCount === 1 ? "item" : "items"}`
          : "Press / to search planning context"}
      </p>
    </div>
  );
}

export { WorkspaceSearch };
