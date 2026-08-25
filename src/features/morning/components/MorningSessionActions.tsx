"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type MorningSessionActionsProps = {
  readonly disabled: boolean;
  readonly hasDraft: boolean;
  readonly onDiscard: () => Promise<boolean>;
  readonly onResumeLater: () => Promise<void>;
  readonly onSave: () => Promise<boolean>;
};

function MorningSessionActions(props: MorningSessionActionsProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  async function discard() {
    if (await props.onDiscard()) setConfirmingDiscard(false);
  }

  if (confirmingDiscard) {
    return (
      <div className={spacingStyles.detailStack} role="alert">
        <p className={typographyStyles.description}>
          Discard today&apos;s draft? Tasks and the Daily Review stay intact.
        </p>
        <div className={spacingStyles.cluster}>
          <Button disabled={props.disabled} onClick={() => void discard()} variant="danger">
            Discard draft
          </Button>
          <Button disabled={props.disabled} onClick={() => setConfirmingDiscard(false)} variant="ghost">
            Keep draft
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={spacingStyles.cluster} role="group" aria-label="Morning session actions">
      <Button disabled={props.disabled} onClick={() => void props.onSave()} variant="secondary">
        Save draft
      </Button>
      <Button disabled={props.disabled} onClick={() => void props.onResumeLater()} variant="ghost">
        Resume later
      </Button>
      {props.hasDraft ? (
        <Button disabled={props.disabled} onClick={() => setConfirmingDiscard(true)} variant="ghost">
          Discard
        </Button>
      ) : null}
    </div>
  );
}

export { MorningSessionActions };
