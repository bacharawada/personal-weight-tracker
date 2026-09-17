"""Basal metabolic rate (BMR) and total daily energy expenditure (TDEE).

The BMR is the energy the body spends at complete rest. It is estimated with
the Mifflin-St Jeor equation (1990), the formula with the best agreement with
indirect calorimetry in the general adult population::

    men:    BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    women:  BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

The formula only exists in those two variants. A third ``"other"`` choice
uses the midpoint of the two constant terms (-78 kcal) and reports the gap to
either variant as an explicit uncertainty (+/- 83 kcal/day on the BMR), so
someone who does not want to, or cannot, pick a side still gets a usable
number with an honest error bar. The variant is a formula input, not an
identity: for a person on hormone therapy the variant matching their hormonal
status is the better estimate.

The TDEE scales the BMR by a physical-activity factor (the classic
1.2 -> 1.9 ladder). Both are population estimates with a typical error of
about 10 %, so they are a starting point, not a measurement.

The third number this module produces is the *estimated intake*: combined
with the energy balance inferred from the weight trend
(:mod:`analysis.energy`), ``TDEE + balance`` gives an idea of the calories
actually eaten over the recent window without logging a single meal. It
inherits every caveat of both inputs.

This module is UI-agnostic — no FastAPI or DB imports. The public estimator
never raises: a populated ``missing`` list and ``reason`` explain why no
number could be produced.
"""

from __future__ import annotations

import datetime
from typing import Literal

Sex = Literal["male", "female", "other"]

ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]

# BMR -> TDEE multipliers, from least to most active. The wording of each level
# (office job, training frequency...) lives in the frontend i18n resources.
ACTIVITY_FACTORS: dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

# Constant term of the Mifflin-St Jeor equation per variant. "other" is the
# midpoint of the two published variants.
_SEX_OFFSET_KCAL: dict[str, float] = {"male": 5.0, "female": -161.0, "other": -78.0}

# Half the gap between the two published constants: the +/- uncertainty the
# "other" variant carries on top of the formula's own error.
_OTHER_HALF_GAP_KCAL = 83.0

# +/- uncertainty on the BMR attributable to the variant choice alone.
_SEX_UNCERTAINTY_KCAL: dict[str, float] = {
    "male": 0.0,
    "female": 0.0,
    "other": _OTHER_HALF_GAP_KCAL,
}


def age_from_birth_date(birth_date: datetime.date, today: datetime.date) -> int:
    """Return the age in completed years on *today*.

    Args:
        birth_date: Date of birth.
        today: Reference date.

    Returns:
        Whole years elapsed, accounting for whether this year's birthday has
        passed yet. Negative when *birth_date* is in the future.
    """
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def mifflin_st_jeor(
    weight_kg: float,
    height_cm: float,
    age_years: int,
    sex: str,
) -> float:
    """Return the Mifflin-St Jeor basal metabolic rate in kcal/day.

    Args:
        weight_kg: Body weight in kilograms.
        height_cm: Height in centimetres.
        age_years: Age in whole years.
        sex: ``"male"`` or ``"female"`` (the formula's two variants), or
            ``"other"`` for the midpoint of the two.

    Returns:
        Estimated BMR in kcal/day.

    Raises:
        KeyError: If *sex* is not one of the supported values.
    """
    return 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_years + _SEX_OFFSET_KCAL[sex]


def _empty(missing: list[str], reason: str) -> dict:
    """Return a metabolism estimate with no computed number.

    Args:
        missing: Names of the inputs that prevent the computation.
        reason: Human-readable explanation.

    Returns:
        A JSON-ready dict with ``has_data=False`` and null numeric fields.
    """
    return {
        "has_data": False,
        "missing": missing,
        "weight_kg": None,
        "age_years": None,
        "bmr_kcal": None,
        "bmr_low": None,
        "bmr_high": None,
        "activity_level": None,
        "activity_factor": None,
        "tdee_kcal": None,
        "tdee_by_level": {},
        "intake_kcal": None,
        "intake_low": None,
        "intake_high": None,
        "reason": reason,
    }


def estimate_metabolism(
    weight_kg: float | None,
    height_cm: float | None,
    sex: str | None,
    birth_date: datetime.date | None,
    activity_level: str | None,
    energy_balance: dict | None = None,
    today: datetime.date | None = None,
) -> dict:
    """Estimate BMR, TDEE and the implied calorie intake.

    The BMR needs all four body inputs; ``missing`` lists whichever are
    absent so the UI can ask for exactly those. The TDEE additionally needs
    an *activity_level*, and the intake estimate needs both a TDEE and an
    energy balance with ``has_data`` — each of those is ``None`` when its
    inputs are not there, while the BMR is still returned.

    Args:
        weight_kg: Latest body weight in kilograms, or ``None`` when the user
            has no measurement yet.
        height_cm: Height in centimetres from the profile.
        sex: ``"male"`` / ``"female"`` / ``"other"`` from the profile. Any
            other value is treated as missing.
        birth_date: Date of birth from the profile.
        activity_level: One of :data:`ACTIVITY_FACTORS`'s keys, or ``None``.
            An unknown value is treated as ``None``.
        energy_balance: Output of :func:`analysis.energy.estimate_energy_balance`
            (signed kcal/day), or ``None`` to skip the intake estimate.
        today: Reference date for the age. Defaults to ``date.today()``.

    Returns:
        A JSON-ready dict matching the ``MetabolismOut`` schema. Always
        returns a value — never raises.
    """
    if today is None:
        today = datetime.date.today()

    missing: list[str] = []
    if weight_kg is None:
        missing.append("weight")
    if height_cm is None:
        missing.append("height")
    if sex not in _SEX_OFFSET_KCAL:
        missing.append("sex")
    if birth_date is None:
        missing.append("birth_date")
    if missing or weight_kg is None or height_cm is None or sex is None or birth_date is None:
        return _empty(missing, "Missing inputs: " + ", ".join(missing))

    age_years = age_from_birth_date(birth_date, today)
    if age_years < 0:
        return _empty(["birth_date"], "Birth date is in the future.")

    bmr = mifflin_st_jeor(weight_kg, height_cm, age_years, sex)
    half_gap = _SEX_UNCERTAINTY_KCAL[sex]
    tdee_by_level = {level: bmr * factor for level, factor in ACTIVITY_FACTORS.items()}

    level = activity_level if activity_level in ACTIVITY_FACTORS else None
    factor = ACTIVITY_FACTORS[level] if level is not None else None
    tdee = tdee_by_level[level] if level is not None else None

    intake = intake_low = intake_high = None
    if tdee is not None and energy_balance is not None and energy_balance.get("has_data"):
        intake = tdee + energy_balance["balance_kcal_day"]
        intake_low = tdee + energy_balance["balance_low"]
        intake_high = tdee + energy_balance["balance_high"]

    return {
        "has_data": True,
        "missing": [],
        "weight_kg": weight_kg,
        "age_years": age_years,
        "bmr_kcal": bmr,
        # Equal to bmr_kcal for the two published variants; the "other"
        # midpoint spans the gap to either one.
        "bmr_low": bmr - half_gap,
        "bmr_high": bmr + half_gap,
        "activity_level": level,
        "activity_factor": factor,
        "tdee_kcal": tdee,
        "tdee_by_level": tdee_by_level,
        "intake_kcal": intake,
        "intake_low": intake_low,
        "intake_high": intake_high,
        "reason": "",
    }
