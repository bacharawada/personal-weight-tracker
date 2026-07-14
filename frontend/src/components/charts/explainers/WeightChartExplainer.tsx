import { useTranslation } from "react-i18next";
import { Formula } from "../Formula";
import { kgToDisplay, unitLabel } from "../../../lib/units";
import {
  ModelId,
  type ChartParams,
  type ModelDiagnostics,
  type WeightChartData,
  type WeightUnit,
} from "../../../lib/types";

interface WeightChartExplainerProps {
  data: WeightChartData | null;
  params: ChartParams;
  unit: WeightUnit;
}

function findDiagnostics(
  data: WeightChartData | null,
  id: ModelId,
): ModelDiagnostics | null {
  return data?.models.find((m) => m.id === id)?.diagnostics ?? null;
}

/** Methodology write-up for the main weight chart, with the live fitted values. */
export function WeightChartExplainer({ data, params, unit }: WeightChartExplainerProps) {
  const { t } = useTranslation("analysis");
  const u = unitLabel(unit);
  const expDiag = findDiagnostics(data, ModelId.Exp);
  const linDiag = findDiagnostics(data, ModelId.Linear);
  const expWarning = data?.models.find((m) => m.id === ModelId.Exp)?.warning ?? "";
  const window = data?.smoothing_window ?? params.smoothing;

  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("weightExplainer.smoothedHeading")}
        </h4>
        <p>{t("weightExplainer.smoothedBody", { window })}</p>
      </section>

      {params.showExp && (
        <section>
          <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
            {t("weightExplainer.expHeading")}
          </h4>
          <p>{t("weightExplainer.expIntro")}</p>
          <Formula tex={String.raw`w(t) = a\,e^{-b\,t} + c`} block />
          {expDiag && expDiag.a != null && expDiag.b != null && expDiag.c != null ? (
            <>
              <p>{t("weightExplainer.expFitIntro")}</p>
              <Formula
                tex={String.raw`w(t) = ${kgToDisplay(expDiag.a, unit).toFixed(1)}\,e^{-${expDiag.b.toFixed(4)}\,t} + ${kgToDisplay(expDiag.c, unit).toFixed(1)}\ \text{${u}}`}
                block
              />
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <Formula tex="c" /> {t("weightExplainer.expEquilibriumPrefix")}{" "}
                  <strong>{t("weightExplainer.expEquilibriumLabel")}</strong>:{" "}
                  {kgToDisplay(expDiag.c, unit).toFixed(1)}
                  {expDiag.c_std != null && (
                    <> ± {kgToDisplay(expDiag.c_std, unit).toFixed(1)}</>
                  )}{" "}
                  {u} {t("weightExplainer.expEquilibriumDashed")}
                </li>
                <li>
                  <Formula tex="a" /> {t("weightExplainer.expAboveEquilibrium")}{" "}
                  <Formula tex="b" /> {t("weightExplainer.expDecayRate")}
                </li>
                {expDiag.half_life_days != null && (
                  <li>
                    {t("weightExplainer.expHalfLifeBefore")}{" "}
                    <strong>{t("weightExplainer.expHalfLifeLabel")}</strong>{" "}
                    {t("weightExplainer.expHalfLifeIs")}{" "}
                    <Formula tex={String.raw`\ln 2 / b`} />{" "}
                    {t("weightExplainer.expHalfLifeApprox", {
                      count: Math.round(expDiag.half_life_days),
                      days: Math.round(expDiag.half_life_days),
                    })}
                  </li>
                )}
                {expDiag.current_rate_per_week != null && (
                  <li>
                    {t("weightExplainer.expCurrentSlope", {
                      rate: kgToDisplay(expDiag.current_rate_per_week, unit).toFixed(2),
                      unit: u,
                    })}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="italic text-gray-400">
              {t("weightExplainer.expNoConverge")}
            </p>
          )}
          <p className="mt-2">
            {t("weightExplainer.expRecencyBefore")}{" "}
            <strong>{t("weightExplainer.expRecencyLabel")}</strong>{" "}
            {t("weightExplainer.expRecencyAfter")}
          </p>
          {expWarning && (
            <p className="mt-2 rounded-md bg-amber-50 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {expWarning}
            </p>
          )}
        </section>
      )}

      {params.showLinear && (
        <section>
          <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
            {t("weightExplainer.linHeading")}
          </h4>
          <p>
            {t("weightExplainer.linIntroBefore")}{" "}
            <em>{t("weightExplainer.linIntroCurrent")}</em>{" "}
            {t("weightExplainer.linIntroEstimator")}{" "}
            <strong>{t("weightExplainer.linEstimatorLabel")}</strong>{" "}
            {t("weightExplainer.linIntroWindow", { days: linDiag?.window_days ?? 56 })}
          </p>
          <Formula
            tex={String.raw`\hat{\beta} = \operatorname{median}_{i<j}\left(\frac{w_j - w_i}{t_j - t_i}\right)`}
            block
          />
          <p>{t("weightExplainer.linRobust")}</p>
          {linDiag && linDiag.slope_per_week != null ? (
            <p className="mt-2">
              {t("weightExplainer.linTrendPrefix")}{" "}
              <strong>
                {t("weightExplainer.linTrendValue", {
                  slope: kgToDisplay(linDiag.slope_per_week, unit).toFixed(2),
                  unit: u,
                })}
              </strong>
              {linDiag.slope_low_per_week != null && linDiag.slope_high_per_week != null && (
                <>
                  {" "}
                  {t("weightExplainer.linTrendCi", {
                    low: kgToDisplay(linDiag.slope_low_per_week, unit).toFixed(2),
                    high: kgToDisplay(linDiag.slope_high_per_week, unit).toFixed(2),
                    unit: u,
                  })}
                </>
              )}
              , {t("weightExplainer.linTrendFitOver", { count: linDiag.n_points })}
              {linDiag.used_fallback
                ? ` ${t("weightExplainer.linTrendFallback")}`
                : ""}
              .
            </p>
          ) : (
            <p className="italic text-gray-400">
              {t("weightExplainer.linNotEnough")}
            </p>
          )}
        </section>
      )}
    </>
  );
}
