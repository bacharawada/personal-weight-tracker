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
import { DatePicker } from "../components/ui/date-picker";
import { SegmentedControl } from "../components/ui/segmented-control";
import { ShareSettings } from "../components/profile/ShareSettings";
import { MetabolismCard } from "../components/profile/MetabolismCard";
import { localDateToIso } from "../lib/dates";
import { ACTIVITY_LEVELS } from "../lib/metabolism";
import { Sex, type ActivityLevel } from "../lib/types";
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
  const [sex, setSex] = useState<Sex | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
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
    setSex(profile.sex);
    setBirthDate(profile.birth_date ?? "");
    setActivityLevel(profile.activity_level);
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
        sex,
        birth_date: birthDate.trim() === "" ? null : birthDate,
        activity_level: activityLevel,
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
  const today = localDateToIso(new Date());
  const sexOptions = [
    { value: Sex.Male, label: t("goalBody.sex.male") },
    { value: Sex.Female, label: t("goalBody.sex.female") },
    { value: Sex.Other, label: t("goalBody.sex.other"), shortLabel: t("goalBody.sex.otherShort") },
  ];
  const activityOptions = ACTIVITY_LEVELS.map((level) => ({
    value: level,
    label: t(`metabolism.activity.${level}.label`),
    shortLabel: t(`metabolism.activity.${level}.shortLabel`),
  }));

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
                <DatePicker
                  id="profile-target"
                  value={targetDate}
                  onChange={(v) => setTargetDate(v ?? "")}
                  clearable
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Metabolism inputs: sex / birth date / activity level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t("goalBody.fields.sex")}</Label>
                  {sex != null && (
                    <button
                      type="button"
                      onClick={() => setSex(null)}
                      className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {t("goalBody.sex.clear")}
                    </button>
                  )}
                </div>
                <SegmentedControl
                  options={sexOptions}
                  value={sex}
                  onChange={setSex}
                  ariaLabel={t("goalBody.fields.sex")}
                  size="sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {sex === Sex.Other ? t("goalBody.sex.otherHint") : t("goalBody.sex.hint")}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-birth" className="text-xs text-muted-foreground">{t("goalBody.fields.birthDate")}</Label>
                <DatePicker
                  id="profile-birth"
                  value={birthDate}
                  onChange={(v) => setBirthDate(v ?? "")}
                  min="1900-01-01"
                  max={today}
                  clearable
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("goalBody.fields.activity")}</Label>
              <SegmentedControl
                options={activityOptions}
                value={activityLevel}
                onChange={setActivityLevel}
                ariaLabel={t("goalBody.fields.activity")}
                size="sm"
              />
              <p className="text-[11px] text-muted-foreground">
                {activityLevel != null
                  ? t(`metabolism.activity.${activityLevel}.description`)
                  : t("goalBody.activityHint")}
              </p>
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

        {/* Metabolism */}
        <MetabolismCard />

        {/* Sharing */}
        <ShareSettings />
      </div>
    </PageTransition>
  );
}
