import { useTranslation } from "react-i18next";
import { getPalette } from "../../../lib/palettes";
import type { ChartParams } from "../../../lib/types";
import { TogglePill } from "../../ui/toggle-pill";
import { ControlGroup } from "./ControlGroup";

interface SeriesTogglesProps {
  params: ChartParams;
  onChange: (params: ChartParams) => void;
  className?: string;
}

/**
 * Series group: one pill per plotted trace, each carrying the trace's own colour.
 *
 * The uncertainty band is drawn per model, so with no model enabled it has nothing
 * to shade — its pill is disabled rather than silently doing nothing.
 */
export function SeriesToggles({ params, onChange, className }: SeriesTogglesProps) {
  const { t } = useTranslation("analysis");
  const { t: tMed } = useTranslation("medication");
  const palette = getPalette(params.palette);
  const hasModel = params.showExp || params.showLinear;

  return (
    <ControlGroup label={t("controls.predictionModels")} className={className}>
      <div className="flex flex-wrap gap-2">
        <TogglePill
          label={t("controls.rollingMean")}
          isPressed={params.showSmoothed}
          onPressedChange={(isPressed) => onChange({ ...params, showSmoothed: isPressed })}
          swatchColor={palette.smoothed}
        />
        <TogglePill
          label={t("controls.exponentialDecay")}
          isPressed={params.showExp}
          onPressedChange={(isPressed) => onChange({ ...params, showExp: isPressed })}
          swatchColor={palette.fit}
        />
        <TogglePill
          label={t("controls.linearTrend")}
          isPressed={params.showLinear}
          onPressedChange={(isPressed) => onChange({ ...params, showLinear: isPressed })}
          swatchColor={palette.fitLinear}
        />
        <TogglePill
          label={t("controls.showUncertaintyBand")}
          isPressed={params.showBand}
          onPressedChange={(isPressed) => onChange({ ...params, showBand: isPressed })}
          swatchColor={palette.band}
          disabled={!hasModel}
          title={hasModel ? undefined : t("controls.bandNeedsModel")}
        />
        <TogglePill
          label={tMed("chart.toggle")}
          isPressed={params.showDoses}
          onPressedChange={(isPressed) => onChange({ ...params, showDoses: isPressed })}
          swatchColor={palette.accent}
        />
      </div>
    </ControlGroup>
  );
}
