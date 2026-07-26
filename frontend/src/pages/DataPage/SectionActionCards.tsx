/**
 * SectionActionCards — the add and import entry points of a data section.
 *
 * Two shapes for the same pair of actions:
 *
 * - Below sm, a row of compact buttons. The cards need 13rem each to keep their
 *   description readable, so on a phone they wrapped into two stacked blocks and
 *   cost ~150px of the height the table needs.
 * - From sm, the icon cards, in a wrapping flex row rather than a responsive
 *   grid so the pair reacts to the panel's own width instead of the viewport's:
 *   side by side in a full-width card, stacked in a narrow column.
 */

import { FileUp, Plus } from "lucide-react";
import { ActionCard } from "../../components/ui/ActionCard";
import { Button } from "../../components/ui/button";

/** Narrower than this and the card's description would be unreadable. */
const MIN_CARD_WIDTH = "min-w-[13rem]";

interface SectionActionCardsProps {
  addTitle: string;
  addDescription: string;
  /** Label used by the compact phone button, where the full title won't fit. */
  addShortTitle: string;
  onAdd: () => void;
  importTitle: string;
  importDescription: string;
  importShortTitle: string;
  onImport: () => void;
}

export function SectionActionCards({
  addTitle,
  addDescription,
  addShortTitle,
  onAdd,
  importTitle,
  importDescription,
  importShortTitle,
  onImport,
}: SectionActionCardsProps) {
  return (
    <>
      <div className="flex gap-2 sm:hidden">
        <Button variant="primary" onClick={onAdd} className="flex-1">
          <Plus size={16} />
          {addShortTitle}
        </Button>
        <Button variant="secondary" onClick={onImport} className="flex-1">
          <FileUp size={16} />
          {importShortTitle}
        </Button>
      </div>

      <div className="hidden flex-wrap gap-3 sm:flex">
        <div className={`flex-1 ${MIN_CARD_WIDTH}`}>
          <ActionCard
            icon={<Plus size={18} />}
            title={addTitle}
            description={addDescription}
            onClick={onAdd}
          />
        </div>
        <div className={`flex-1 ${MIN_CARD_WIDTH}`}>
          <ActionCard
            icon={<FileUp size={18} />}
            title={importTitle}
            description={importDescription}
            onClick={onImport}
          />
        </div>
      </div>
    </>
  );
}
