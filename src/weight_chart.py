import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch
from scipy.stats import linregress
from scipy.optimize import curve_fit
from scipy.interpolate import make_interp_spline
import warnings
warnings.filterwarnings('ignore')

# ── Data ────────────────────────────────────────────────────────────────────
data = {
    "date": [
        "2025-06-01","2025-06-04","2025-06-08","2025-06-16","2025-06-23","2025-06-29",
        "2025-07-06","2025-07-12","2025-07-19","2025-08-03","2025-08-08","2025-08-10",
        "2025-08-12","2025-09-10","2025-10-01","2025-10-12","2025-10-24","2025-11-12",
        "2025-11-23","2025-12-02","2025-12-14","2025-12-27","2026-01-03","2026-01-22",
        "2026-01-28","2026-02-08","2026-02-13","2026-02-18","2026-02-24","2026-03-25",
        "2026-04-10","2026-04-23"
    ],
    "weight": [
        183.55,182.8,181.85,181.7,179.95,178.3,176.7,176.48,175.75,174.0,173.5,
        172.6,169.95,168.15,167.45,165.2,164.75,163.75,162.7,161.0,160.25,159.6,
        157.45,157.5,157.4,156.8,155.65,154.8,154.1,153.4,152.5,151.75
    ]
}

df = pd.DataFrame(data)
df['date'] = pd.to_datetime(df['date'])
df = df.groupby('date')['weight'].mean().reset_index().sort_values('date')

# ── Derived quantities ───────────────────────────────────────────────────────
df['days'] = (df['date'] - df['date'].iloc[0]).dt.days
df['rolling5'] = df['weight'].rolling(window=5, center=True, min_periods=2).mean()

# True time-based derivative (kg / day, then convert to kg/week)
dt_days = df['days'].diff()
dw      = df['weight'].diff()
df['deriv_kgday']  = dw / dt_days           # kg/day
df['deriv_kgweek'] = df['deriv_kgday'] * 7  # kg/week (smoother to read)
df['deriv_smooth'] = df['deriv_kgweek'].rolling(window=5, center=True, min_periods=2).mean()

# ── Exponential-decay model ──────────────────────────────────────────────────
#   w(t) = a * exp(-b*t) + c
def exp_decay(t, a, b, c):
    return a * np.exp(-b * t) + c

x = df['days'].values.astype(float)
y = df['weight'].values.astype(float)
try:
    popt, _ = curve_fit(exp_decay, x, y, p0=[30, 0.003, 150], maxfev=8000)
    x_fit   = np.linspace(x.min(), x.max(), 400)
    y_fit   = exp_decay(x_fit, *popt)
    fit_ok  = True
except Exception:
    fit_ok = False

# Map fitted x back to dates
date_fit = df['date'].iloc[0] + pd.to_timedelta(x_fit, unit='D')

# ── Deviation zones ──────────────────────────────────────────────────────────
# Residual = actual - model; flag large deviations
if fit_ok:
    residuals = y - exp_decay(x, *popt)
    std_res   = residuals.std()
    df['plateau'] = residuals > 0.5 * std_res
    df['accel']   = residuals < -0.5 * std_res

# ── Palette & style ──────────────────────────────────────────────────────────
BG        = '#F7F8FA'
PANEL     = '#FFFFFF'
GRID      = '#DDE2EC'
RAW_COL   = '#2E6DB4'
SMOOTH_COL= '#C97A0A'
FIT_COL   = '#B83045'
DERIV_COL = '#1E8C5E'
DERIV_SM  = '#136644'
ACCENT    = '#0D1117'
TEXT_MAIN = '#1A1E2E'
TEXT_DIM  = '#5A6480'

plt.rcParams.update({
    'font.family'      : 'DejaVu Sans',
    'text.color'       : TEXT_MAIN,
    'axes.labelcolor'  : TEXT_MAIN,
    'xtick.color'      : TEXT_DIM,
    'ytick.color'      : TEXT_DIM,
    'axes.facecolor'   : PANEL,
    'figure.facecolor' : BG,
    'axes.edgecolor'   : GRID,
    'axes.grid'        : True,
    'grid.color'       : GRID,
    'grid.linewidth'   : 0.7,
    'grid.alpha'       : 1.0,
})

# ── Figure layout ────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 10), dpi=140)
gs  = gridspec.GridSpec(3, 1, figure=fig,
                        height_ratios=[3.5, 1.5, 1.8],
                        hspace=0.08,
                        left=0.07, right=0.97, top=0.92, bottom=0.09)

ax1 = fig.add_subplot(gs[0])  # main weight chart
ax2 = fig.add_subplot(gs[1], sharex=ax1)  # derivative
ax3 = fig.add_subplot(gs[2], sharex=ax1)  # residuals / deviation

# ════════════════════════════════════════════════════════════════════════════
# PANEL 1 – Weight over time
# ════════════════════════════════════════════════════════════════════════════

# Deviation zones
if fit_ok:
    for _, row in df.iterrows():
        if row['plateau']:
            ax1.axvspan(row['date'] - pd.Timedelta(days=3),
                        row['date'] + pd.Timedelta(days=3),
                        color='#F0C060', alpha=0.06, zorder=0)
        if row['accel']:
            ax1.axvspan(row['date'] - pd.Timedelta(days=3),
                        row['date'] + pd.Timedelta(days=3),
                        color='#70D0A0', alpha=0.06, zorder=0)

# Area fill under raw line
ax1.fill_between(df['date'], df['weight'], df['weight'].min() - 2,
                 color=RAW_COL, alpha=0.07)

# Raw data line + scatter
ax1.plot(df['date'], df['weight'],
         color=RAW_COL, lw=1.4, alpha=0.7, zorder=2, label='Raw measurements')
ax1.scatter(df['date'], df['weight'],
            color=RAW_COL, s=40, zorder=4, edgecolors='white', linewidths=0.5)

# Rolling mean
ax1.plot(df['date'], df['rolling5'],
         color=SMOOTH_COL, lw=2.4, zorder=3, label='Rolling mean (5-pt)')

# Exponential decay fit
if fit_ok:
    ax1.plot(date_fit, y_fit,
             color=FIT_COL, lw=1.8, ls='--', zorder=3,
             label=f'Exp. decay fit  (a={popt[0]:.1f}, λ={popt[1]*365:.2f}/yr)')

# Annotations: total loss & first/last
total_loss = df['weight'].iloc[0] - df['weight'].iloc[-1]
ax1.annotate(f'Total loss: −{total_loss:.1f} kg',
             xy=(df['date'].iloc[-1], df['weight'].iloc[-1]),
             xytext=(-110, 18), textcoords='offset points',
             fontsize=9.5, color=TEXT_MAIN, fontweight='bold',
             arrowprops=dict(arrowstyle='->', color=TEXT_DIM, lw=1.2))

ax1.set_ylabel('Weight (kg)', fontsize=10.5, labelpad=10)
ax1.set_ylim(df['weight'].min() - 3, df['weight'].max() + 3)
ax1.legend(loc='upper right', fontsize=8.5,
           facecolor=PANEL, edgecolor=GRID, framealpha=0.9)
ax1.set_title('Body Weight Progression  |  June 2025 → April 2026',
              fontsize=13, fontweight='bold', color=ACCENT, pad=12)

# Secondary y: cumulative loss
ax1r = ax1.twinx()
ax1r.set_ylim(ax1.get_ylim())
yticks = ax1.get_yticks()
ax1r.set_yticks(yticks)
ax1r.set_yticklabels([f'−{df["weight"].iloc[0]-v:.1f}' for v in yticks],
                      fontsize=7.5, color='#7A8EAA')
ax1r.set_ylabel('Cumulative loss (kg)', fontsize=8.5, color='#7A8EAA', labelpad=8)
ax1r.tick_params(axis='y', colors='#7A8EAA')
ax1r.spines['right'].set_color(GRID)

# ════════════════════════════════════════════════════════════════════════════
# PANEL 2 – Rate of change (kg/week)
# ════════════════════════════════════════════════════════════════════════════

ax2.axhline(0, color=GRID, lw=1, ls='--')
ax2.bar(df['date'], df['deriv_kgweek'],
        width=3, color=np.where(df['deriv_kgweek'] < 0, DERIV_COL, '#E07070'),
        alpha=0.55, label='Rate (kg/week)', zorder=2)
ax2.plot(df['date'], df['deriv_smooth'],
         color=DERIV_SM, lw=1.8, zorder=3, label='Smoothed rate')

ax2.set_ylabel('Rate\n(kg / week)', fontsize=9, labelpad=10)
ax2.set_ylim(df['deriv_kgweek'].min() * 1.4, df['deriv_kgweek'].max() * 1.4 + 1)
ax2.legend(loc='lower right', fontsize=7.5,
           facecolor=PANEL, edgecolor=GRID, framealpha=0.9)

# ════════════════════════════════════════════════════════════════════════════
# PANEL 3 – Residuals vs. model
# ════════════════════════════════════════════════════════════════════════════
if fit_ok:
    res = y - exp_decay(x, *popt)
    pos_mask = res >= 0
    neg_mask = res <  0

    ax3.axhline(0, color=FIT_COL, lw=1.2, ls='--', alpha=0.7)
    ax3.fill_between(df['date'],  res, 0, where=pos_mask,
                     color='#F0C060', alpha=0.4, label='Above model (plateau)')
    ax3.fill_between(df['date'],  res, 0, where=neg_mask,
                     color='#70D0A0', alpha=0.4, label='Below model (acceleration)')
    ax3.scatter(df['date'], res, color='white', s=20, zorder=5, alpha=0.8)
    ax3.plot(df['date'], res, color=TEXT_DIM, lw=1, alpha=0.5)

    ax3.axhspan(-std_res, std_res, color='white', alpha=0.03, label='±1σ band')

    ax3.set_ylabel('Residuals\n(kg vs model)', fontsize=9, labelpad=10)
    ax3.legend(loc='lower right', fontsize=7.5,
               facecolor=PANEL, edgecolor=GRID, framealpha=0.9)
else:
    ax3.text(0.5, 0.5, 'Residuals unavailable (fit failed)',
             ha='center', va='center', transform=ax3.transAxes, color=TEXT_DIM)

# ── Shared x-axis formatting ─────────────────────────────────────────────────
for ax in [ax1, ax2, ax3]:
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
    ax.xaxis.set_minor_locator(mdates.WeekdayLocator())
    ax.tick_params(axis='x', labelsize=9)
    for spine in ax.spines.values():
        spine.set_edgecolor(GRID)

plt.setp(ax1.get_xticklabels(), visible=False)
plt.setp(ax2.get_xticklabels(), visible=False)
ax3.tick_params(axis='x', rotation=25)

# ── Watermark / caption ───────────────────────────────────────────────────────
fig.text(0.5, 0.005,
         f'n={len(df)} measurements  ·  {df["date"].iloc[0].strftime("%d %b %Y")} → '
         f'{df["date"].iloc[-1].strftime("%d %b %Y")}  ·  '
         f'Δw = −{total_loss:.2f} kg  ·  '
         f'avg = −{total_loss/(df["days"].iloc[-1]/7):.2f} kg/week',
         ha='center', va='bottom', fontsize=8, color=TEXT_DIM)

plt.savefig('/mnt/user-data/outputs/weight_progression.png',
            dpi=150, bbox_inches='tight', facecolor=BG)
print("Saved.")
