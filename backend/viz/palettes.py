"""Colour palette definitions for all chart traces.

Each palette is a ``PaletteConfig`` frozen dataclass.  The ``PALETTES``
registry maps human-readable names to palette instances and is used by
the UI's palette picker dropdown.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PaletteConfig:
    """Typed colour palette for all chart traces and UI accents.

    Attributes:
        name: Human-readable palette name.
        accent: Primary UI accent color (buttons, active states, titles,
            spinners, focus rings). Dedicated to interactive chrome —
            never used on chart traces.
        raw: Colour for raw data points and line.
        smoothed: Colour for the rolling-mean (smoothed) line.
        fit: Colour for the exponential-decay fit curve.
        derivative: Colour for negative derivative bars.
        derivative_pos: Colour for positive derivative bars.
        derivative_smooth: Colour for the smoothed derivative line.
        residual_above: Colour for plateau shading (residual > 0).
        residual_below: Colour for acceleration shading (residual < 0).
    """

    name: str
    accent: str
    raw: str
    smoothed: str
    fit: str
    derivative: str
    derivative_pos: str
    derivative_smooth: str
    residual_above: str
    residual_below: str


PALETTES: dict[str, PaletteConfig] = {
    "Classic": PaletteConfig(
        name="Classic",
        accent="#2563EB",   # blue-600
        raw="#2E6DB4",
        smoothed="#C97A0A",
        fit="#2CA02C",
        derivative="#1E8C5E",
        derivative_pos="#E07070",
        derivative_smooth="#136644",
        residual_above="#F0C060",
        residual_below="#70D0A0",
    ),
    "Teal": PaletteConfig(
        name="Teal",
        accent="#0D9488",   # teal-600
        raw="#00897B",
        smoothed="#26A69A",
        fit="#004D40",
        derivative="#00695C",
        derivative_pos="#EF5350",
        derivative_smooth="#00796B",
        residual_above="#FFB74D",
        residual_below="#4DB6AC",
    ),
    "Warm": PaletteConfig(
        name="Warm",
        accent="#D97706",   # amber-600
        raw="#E65100",
        smoothed="#FF8F00",
        fit="#BF360C",
        derivative="#D84315",
        derivative_pos="#C62828",
        derivative_smooth="#A1887F",
        residual_above="#FFE082",
        residual_below="#FFAB91",
    ),
    "Monochrome": PaletteConfig(
        name="Monochrome",
        accent="#374151",   # gray-700
        raw="#424242",
        smoothed="#757575",
        fit="#1565C0",
        derivative="#616161",
        derivative_pos="#EF5350",
        derivative_smooth="#9E9E9E",
        residual_above="#E0E0E0",
        residual_below="#BDBDBD",
    ),
    "Forest": PaletteConfig(
        name="Forest",
        accent="#16A34A",   # green-600
        raw="#2E7D32",
        smoothed="#558B2F",
        fit="#33691E",
        derivative="#388E3C",
        derivative_pos="#D84315",
        derivative_smooth="#1B5E20",
        residual_above="#A5D6A7",
        residual_below="#81C784",
    ),
}
