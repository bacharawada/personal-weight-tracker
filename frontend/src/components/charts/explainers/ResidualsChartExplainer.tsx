import { Formula } from "../Formula";

/** Methodology write-up for the residuals chart. */
export function ResidualsChartExplainer() {
  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          Residuals — what the model cannot explain
        </h4>
        <p>Each point is the difference between a measurement and the model's prediction
          on that date:
        </p>
        <Formula tex={String.raw`e_i = w_i - \hat{w}(t_i)`} block />
        <p>
          A good fit leaves residuals scattered randomly around zero. Structure is
          information: a run of points drifting upward means you are falling behind the
          model's pace; a downward run means you are beating it.
        </p>
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          The ±1σ band and deviation zones
        </h4>
        <p>
          The shaded band spans ±1 standard deviation of the residuals — roughly two
          thirds of the points should fall inside it. Separately, measurements more than
          0.5σ <em>above</em> the exponential fit are flagged as{" "}
          <strong>plateau</strong> zones (progress slower than the model) and more than
          0.5σ <em>below</em> it as <strong>acceleration</strong> zones; those zones are
          shaded on the main weight chart.
        </p>
      </section>
    </>
  );
}
