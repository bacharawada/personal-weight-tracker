import { useTranslation } from "react-i18next";
import { Formula } from "../Formula";

/** Energy density of body-mass change, in kcal per kg (see backend energy.py). */
const ENERGY_DENSITY_KCAL_PER_KG = 7700;

/** Methodology write-up for the estimated energy-balance chart. */
export function EnergyChartExplainer() {
  const { t } = useTranslation("analysis");
  const density = ENERGY_DENSITY_KCAL_PER_KG.toLocaleString();

  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("energyExplainer.balanceHeading")}
        </h4>
        <p>{t("energyExplainer.balanceIntro")}</p>
        <Formula
          tex={String.raw`E \approx \frac{dw}{dt} \times ${ENERGY_DENSITY_KCAL_PER_KG}`}
          block
        />
        <p>{t("energyExplainer.balanceBody", { density })}</p>
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("energyExplainer.caveatsHeading")}
        </h4>
        <p>{t("energyExplainer.caveatsBody", { density })}</p>
      </section>
    </>
  );
}
