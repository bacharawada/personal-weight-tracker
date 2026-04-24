/**
 * ConfirmModal — generic confirmation dialog.
 *
 * Handles any "are you sure?" prompt. Fully configurable: title, description,
 * button label and variant so it works for destructive and non-destructive actions.
 */

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button, buttonVariants } from "../ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Label shown on the confirmation button. */
  confirmLabel: string;
  /** Visual variant of the confirmation button — defaults to "destructive". */
  confirmVariant?: ButtonVariant;
  /** Icon shown inside the confirmation button (optional). */
  confirmIcon?: ReactNode;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  confirmIcon,
  onConfirm,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmIcon}
            {loading ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
