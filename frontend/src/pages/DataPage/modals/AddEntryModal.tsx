/**
 * AddEntryModal — dialog shell for a Data-page "add" form.
 *
 * Holds only the chrome (title, description, sizing); the form itself is
 * passed as children, so the measurements and medication panels share one
 * dialog instead of maintaining a wrapper each.
 */

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";

interface AddEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}

export function AddEntryModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AddEntryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
