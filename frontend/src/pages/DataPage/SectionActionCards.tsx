/**
 * SectionActionCards — the add and import icon cards of a data section.
 *
 * A wrapping flex row rather than a responsive grid, so the pair reacts to the
 * panel's own width instead of the viewport's: side by side in the wide
 * measurements card, stacked in the narrow medication one.
 */

import { FileUp, Plus } from "lucide-react";
import { ActionCard } from "../../components/ui/ActionCard";

/** Narrower than this and the card's description would be unreadable. */
const MIN_CARD_WIDTH = "min-w-[13rem]";

interface SectionActionCardsProps {
  addTitle: string;
  addDescription: string;
  onAdd: () => void;
  importTitle: string;
  importDescription: string;
  onImport: () => void;
}

export function SectionActionCards({
  addTitle,
  addDescription,
  onAdd,
  importTitle,
  importDescription,
  onImport,
}: SectionActionCardsProps) {
  return (
    <div className="flex flex-wrap gap-3">
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
  );
}
