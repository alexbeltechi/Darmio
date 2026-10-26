"use client";

import { DsButton, DsDialog, DsDialogActions, DsDialogCancel } from "@beltechi/parabola";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isPublished?: boolean;
}

/** Asked when leaving a post with unsaved edits: save, discard or stay. */
export function UnsavedChangesModal({
  isOpen,
  onDiscard,
  onSave,
  onCancel,
  isSaving = false,
  isPublished = false,
}: UnsavedChangesModalProps) {
  return (
    <DsDialog
      open={isOpen}
      onOpenChange={(open) => !open && !isSaving && onCancel()}
      title="Unsaved changes"
      description="You have changes that aren't saved yet. What would you like to do?"
    >
      <DsDialogActions>
        <DsButton variant="primary" loading={isSaving} onClick={onSave}>
          {isPublished ? "Save changes" : "Save draft"}
        </DsButton>
        <DsButton destructive disabled={isSaving} onClick={onDiscard}>
          Discard changes
        </DsButton>
        <DsDialogCancel asChild>
          <DsButton disabled={isSaving}>
            Cancel
          </DsButton>
        </DsDialogCancel>
      </DsDialogActions>
    </DsDialog>
  );
}
