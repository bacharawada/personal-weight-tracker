import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleUser, Check } from "lucide-react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { useAuth } from "../context/AuthContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ShareSettings } from "../components/settings/ShareSettings";
import { displayToKg, kgToDisplay, unitLabel } from "../lib/units";

export function ProfilePage() {
  const { t } = useTranslation("profile");
  const { profile, unit, saveProfile } = useWeightTracker();
  const { user } = useAuth();

  const displayName =
    user?.name ||
    (user?.email ? user.email.split("@")[0] : t("identity.fallbackName"));
  const displayEmail = user?.email ?? "";

  // Profile form state — re-seeded from the loaded profile (and whenever the
  // unit changes) via the React "adjust state during render" pattern.
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const profileKey = profile ? `${profile.id}:${unit}` : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (profile && profileKey !== seededKey) {
    setSeededKey(profileKey);
    setHeight(profile.height_cm != null ? String(profile.height_cm) : "");
    setGoal(
      profile.goal_weight != null
        ? kgToDisplay(profile.goal_weight, unit).toFixed(1)
        : "",
    );
    setTargetDate(profile.target_date ?? "");
  }

  async function handleProfileSave() {
    setSavingProfile(true);
    try {
      const heightValue = height.trim() === "" ? null : parseFloat(height);
      const goalValue = goal.trim() === "" ? null : displayToKg(parseFloat(goal), unit);
      await saveProfile({
        height_cm: heightValue,
        goal_weight: goalValue,
        target_date: targetDate.trim() === "" ? null : targetDate,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  }

  const u = unitLabel(unit);

  return (
    <PageTransition>
      <div className="p-4 md:p-6 pb-nav space-y-6 md:space-y-8 max-w-2xl">
        <PageTitle title={t("page.title")} subtitle={t("page.subtitle")} />

        {/* Identity */}
        <section>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex items-center gap-4">
            <div
              className="shrink-0 grid place-items-center w-12 h-12 rounded-full"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 14%, transparent)" }}
            >
              <CircleUser size={26} style={{ color: "var(--color-accent)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </p>
              {displayEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {displayEmail}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Goal & body metrics */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t("goalBody.heading")}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-5">
            {/* Height / goal / target date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="profile-height" className="text-xs text-muted-foreground">{t("goalBody.fields.height")}</Label>
                <Input
                  id="profile-height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min={50}
                  max={300}
                  step={0.5}
                  placeholder={t("goalBody.placeholders.height")}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-goal" className="text-xs text-muted-foreground">{t("goalBody.fields.goal", { unit: u })}</Label>
                <Input
                  id="profile-goal"
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  step={0.1}
                  placeholder={u === "lb" ? t("goalBody.placeholders.goalLb") : t("goalBody.placeholders.goalKg")}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-target" className="text-xs text-muted-foreground">{t("goalBody.fields.targetDate")}</Label>
                <Input
                  id="profile-target"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {profileSaved && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check size={14} /> {t("goalBody.saved")}
                </span>
              )}
              <Button variant="primary" size="sm" onClick={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? t("goalBody.saving") : t("goalBody.save")}
              </Button>
            </div>
          </div>
        </section>

        {/* Sharing */}
        <ShareSettings />
      </div>
    </PageTransition>
  );
}
