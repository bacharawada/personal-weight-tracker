import { useTranslation } from "react-i18next";
import { Formula } from "../Formula";

/** Methodology write-up for the residuals chart. */
export function ResidualsChartExplainer() {
  const { t } = useTranslation("analysis");

  return (
    <>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("residualsExplainer.residualsHeading")}
        </h4>
        <p>{t("residualsExplainer.residualsIntro")}</p>
        <Formula tex={String.raw`e_i = w_i - \hat{w}(t_i)`} block />
        <p>{t("residualsExplainer.residualsBody")}</p>
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
          {t("residualsExplainer.bandHeading")}
        </h4>
        <p>
          {t("residualsExplainer.bandBodyBefore")}{" "}
          <em>{t("residualsExplainer.bandAbove")}</em>{" "}
          {t("residualsExplainer.bandBodyMiddleBefore")}{" "}
          <strong>{t("residualsExplainer.bandPlateauLabel")}</strong>{" "}
          {t("residualsExplainer.bandBodyMiddleAfter")}{" "}
          <em>{t("residualsExplainer.bandBelow")}</em>{" "}
          {t("residualsExplainer.bandBodyBeforeAcceleration")}{" "}
          <strong>{t("residualsExplainer.bandAccelerationLabel")}</strong>{" "}
          {t("residualsExplainer.bandBodyAfter")}
        </p>
      </section>
    </>
  );
}
