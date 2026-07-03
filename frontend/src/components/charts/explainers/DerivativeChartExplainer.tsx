import { Formula } from "../Formula";
import { unitLabel } from "../../../lib/units";
import type { WeightUnit } from "../../../lib/types";

interface DerivativeChartExplainerProps {
  unit: WeightUnit;
}

/** Methodology write-up for the rate-of-change chart. */
export function DerivativeChartExplainer({ unit }: DerivativeChartExplainerProps) {
  const u = unitLabel(unit);

  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          Rate of change — a discrete derivative
        </h4>
        <p>
          Each bar is the weight change between two consecutive measurements divided by
          the actual number of days between them, scaled to a weekly rate:
        </p>
        <Formula
          tex={String.raw`r_i = \frac{w_i - w_{i-1}}{t_i - t_{i-1}} \times 7`}
          block
        />
        <p>
          Using real date gaps (not measurement counts) means unevenly spaced entries are
          handled correctly — skipping a week does not distort the rate. Negative bars
          mean you were losing weight over that interval ({u}/week).
        </p>
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          Smoothed rate
        </h4>
        <p>
          The overlaid line is a 5-point centred rolling mean of the raw rates.
          Consecutive-day rates are extremely noisy (a single water-weight swing dominates
          them), so the smoothed line is the one to read for your sustained pace.
        </p>
      </section>
    </>
  );
}
