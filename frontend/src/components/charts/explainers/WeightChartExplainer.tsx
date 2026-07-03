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
  const u = unitLabel(unit);
  const expDiag = findDiagnostics(data, ModelId.Exp);
  const linDiag = findDiagnostics(data, ModelId.Linear);
  const expWarning = data?.models.find((m) => m.id === ModelId.Exp)?.warning ?? "";
  const window = data?.smoothing_window ?? params.smoothing;

  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          Smoothed line — centred rolling mean
        </h4>
        <p>
          Each smoothed point is the average of {window} consecutive measurements centred
          on it. This damps day-to-day noise (water weight, meal timing) without the lag a
          trailing average would introduce; the first and last points use whatever
          neighbours exist.
        </p>
      </section>

      {params.showExp && (
        <section>
          <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
            Exponential decay — the shape of the whole journey
          </h4>
          <p>
            Weight loss typically slows as you approach a new equilibrium, so the full
            history is fit with a decaying exponential:
          </p>
          <Formula tex={String.raw`w(t) = a\,e^{-b\,t} + c`} block />
          {expDiag && expDiag.a != null && expDiag.b != null && expDiag.c != null ? (
            <>
              <p>Your current fit (t in days since your first measurement):</p>
              <Formula
                tex={String.raw`w(t) = ${kgToDisplay(expDiag.a, unit).toFixed(1)}\,e^{-${expDiag.b.toFixed(4)}\,t} + ${kgToDisplay(expDiag.c, unit).toFixed(1)}\ \text{${u}}`}
                block
              />
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <Formula tex="c" /> is the predicted <strong>equilibrium weight</strong>:{" "}
                  {kgToDisplay(expDiag.c, unit).toFixed(1)}
                  {expDiag.c_std != null && (
                    <> ± {kgToDisplay(expDiag.c_std, unit).toFixed(1)}</>
                  )}{" "}
                  {u} — the dashed horizontal line.
                </li>
                <li>
                  <Formula tex="a" /> is how far above equilibrium you started;{" "}
                  <Formula tex="b" /> is the decay rate per day.
                </li>
                {expDiag.half_life_days != null && (
                  <li>
                    The fit's <strong>half-life</strong> is{" "}
                    <Formula tex={String.raw`\ln 2 / b`} /> ≈{" "}
                    {Math.round(expDiag.half_life_days)} days: every{" "}
                    {Math.round(expDiag.half_life_days)} days, the remaining gap to
                    equilibrium halves.
                  </li>
                )}
                {expDiag.current_rate_per_week != null && (
                  <li>
                    The model's slope at your latest measurement is{" "}
                    {kgToDisplay(expDiag.current_rate_per_week, unit).toFixed(2)} {u}/week.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="italic text-gray-400">
              The fit did not converge on your current data, so no fitted values are shown.
            </p>
          )}
          <p className="mt-2">
            The fit minimises squared error with <strong>recency weighting</strong> — a
            point 60 days older than your latest counts half as much — so the curve tracks
            where you are now rather than being anchored by old history. The shaded band
            is a Monte-Carlo 95% interval: 200 parameter sets are drawn from the fit's
            covariance and the band spans the middle 95% of the resulting curves.
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
            Linear trend — where you are heading right now
          </h4>
          <p>
            This answers a different question than the exponential fit: at your{" "}
            <em>current</em> rate, where are you going? It uses the{" "}
            <strong>Theil–Sen estimator</strong> over roughly the last{" "}
            {linDiag?.window_days ?? 56} days — the median of the slopes between every
            pair of measurements:
          </p>
          <Formula
            tex={String.raw`\hat{\beta} = \operatorname{median}_{i<j}\left(\frac{w_j - w_i}{t_j - t_i}\right)`}
            block
          />
          <p>
            Taking a median instead of a least-squares average makes the slope robust to
            single outlier days. The band comes from the confidence interval on the
            slope, so it is zero-width at your latest measurement and fans out with
            distance.
          </p>
          {linDiag && linDiag.slope_per_week != null ? (
            <p className="mt-2">
              Your current trend is{" "}
              <strong>
                {kgToDisplay(linDiag.slope_per_week, unit).toFixed(2)} {u}/week
              </strong>
              {linDiag.slope_low_per_week != null && linDiag.slope_high_per_week != null && (
                <>
                  {" "}
                  (95% CI {kgToDisplay(linDiag.slope_low_per_week, unit).toFixed(2)} to{" "}
                  {kgToDisplay(linDiag.slope_high_per_week, unit).toFixed(2)} {u}/week)
                </>
              )}
              , fit over {linDiag.n_points} measurements
              {linDiag.used_fallback
                ? " — the recent window was too sparse, so all available data was used"
                : ""}
              .
            </p>
          ) : (
            <p className="italic text-gray-400">
              Not enough recent data to fit a trend.
            </p>
          )}
        </section>
      )}
    </>
  );
}
