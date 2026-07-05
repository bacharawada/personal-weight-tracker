import { useTranslation } from "react-i18next";
import { Formula } from "../Formula";
import { unitLabel } from "../../../lib/units";
import type { WeightUnit } from "../../../lib/types";

interface DerivativeChartExplainerProps {
  unit: WeightUnit;
}

/** Methodology write-up for the rate-of-change chart. */
export function DerivativeChartExplainer({ unit }: DerivativeChartExplainerProps) {
  const { t } = useTranslation("analysis");
  const u = unitLabel(unit);

  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("derivativeExplainer.rateHeading")}
        </h4>
        <p>{t("derivativeExplainer.rateIntro")}</p>
        <Formula
          tex={String.raw`r_i = \frac{w_i - w_{i-1}}{t_i - t_{i-1}} \times 7`}
          block
        />
        <p>{t("derivativeExplainer.rateBody", { unit: u })}</p>
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("derivativeExplainer.smoothedHeading")}
        </h4>
        <p>{t("derivativeExplainer.smoothedBody")}</p>
      </section>
    </>
  );
}
