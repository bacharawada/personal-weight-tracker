/**
 * OnboardingWizard — shown to users on their first login.
 *
 * Steps:
 *   1. Welcome  — brief description + two path choices
 *   2a. CSV     — CsvImport component
 *   2b. Manual  — reuse AddMeasurement form (multiple entries)
 *   3. Done     — summary + "Go to dashboard" button
 *
 * The wizard is dismissed by calling onComplete(), which marks
 * onboarding as done via the API and removes the wizard from the UI.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scale, FileUp, PenLine, ArrowRight, CheckCircle, Plus } from "lucide-react";
import { completeOnboarding, updateProfile } from "../../lib/api";
import type { CsvImportResult } from "../../lib/types";
import { WeightUnit } from "../../lib/types";
import { displayToKg, unitLabel } from "../../lib/units";
import { CsvImport } from "./CsvImport";
import { AddMeasurement } from "../forms/AddMeasurement";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ActionCard } from "../ui/ActionCard";

interface Props {
  /** Called once onboarding is fully complete (API flag set). */
  onComplete: () => void;
  accent: string;
}

type Step = "profile" | "welcome" | "csv" | "manual" | "done";

interface Summary {
  mode: "csv" | "manual" | "skipped";
  csvResult?: CsvImportResult;
  manualCount: number;
}

export function OnboardingWizard({ onComplete, accent }: Props) {
  const [step, setStep] = useState<Step>("profile");
  const [summary, setSummary] = useState<Summary>({ mode: "skipped", manualCount: 0 });
  const [manualCount, setManualCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Optional profile capture (first step).
  const [profileUnit, setProfileUnit] = useState<WeightUnit>(WeightUnit.Kg);
  const [profileHeight, setProfileHeight] = useState("");
  const [profileGoal, setProfileGoal] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function saveProfileAndContinue() {
    const hasInput = profileHeight.trim() !== "" || profileGoal.trim() !== "";
    if (hasInput || profileUnit !== WeightUnit.Kg) {
      try {
        setSavingProfile(true);
        await updateProfile({
          unit_preference: profileUnit,
          height_cm: profileHeight.trim() === "" ? null : parseFloat(profileHeight),
          goal_weight:
            profileGoal.trim() === ""
              ? null
              : displayToKg(parseFloat(profileGoal), profileUnit),
        });
      } catch {
        // non-fatal — the user can set these later in Settings
      } finally {
        setSavingProfile(false);
      }
    }
    setStep("welcome");
  }

  async function finish(s: Summary) {
    setSummary(s);
    setStep("done");
    // Mark onboarding complete in the backend (fire-and-forget; errors are
    // non-fatal — worst case the wizard re-appears on next login).
    try {
      setIsFinishing(true);
      await completeOnboarding();
    } catch {
      // ignore
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleSkip() {
    await finish({ mode: "skipped", manualCount: 0 });
  }

  function handleCsvComplete(result: CsvImportResult) {
    finish({ mode: "csv", csvResult: result, manualCount: 0 });
  }

  function handleManualDone() {
    finish({ mode: "manual", manualCount });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <motion.div
            className="h-full"
            style={{ backgroundColor: "var(--color-accent)" }}
            animate={{
              width:
                step === "profile" ? "20%"
                : step === "welcome" ? "40%"
                : step === "csv" || step === "manual" ? "70%"
                : "100%",
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>

        <div className="p-5 sm:p-8 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {/* ---- Profile (optional) ---- */}
            {step === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>
                    <Scale className="w-8 h-8" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                    A bit about you
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    Optional — set a goal and height to unlock progress projections and
                    BMI. You can change these anytime in Settings.
                  </p>
                </div>

                {/* Units */}
                <div className="flex items-center justify-center gap-2">
                  {[WeightUnit.Kg, WeightUnit.Lb].map((option) => {
                    const isActive = profileUnit === option;
                    return (
                      <button
                        key={option}
                        onClick={() => setProfileUnit(option)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          isActive
                            ? "text-white border-transparent"
                            : "text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        }`}
                        style={isActive ? { backgroundColor: "var(--color-accent)" } : undefined}
                      >
                        {unitLabel(option)}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="onb-height" className="text-xs text-muted-foreground">Height (cm)</Label>
                    <Input
                      id="onb-height"
                      type="number"
                      value={profileHeight}
                      onChange={(e) => setProfileHeight(e.target.value)}
                      min={50}
                      max={300}
                      step={0.5}
                      placeholder="e.g. 178"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="onb-goal" className="text-xs text-muted-foreground">
                      Goal weight ({unitLabel(profileUnit)})
                    </Label>
                    <Input
                      id="onb-goal"
                      type="number"
                      value={profileGoal}
                      onChange={(e) => setProfileGoal(e.target.value)}
                      step={0.1}
                      placeholder={profileUnit === WeightUnit.Lb ? "e.g. 165" : "e.g. 75"}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-between pt-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setStep("welcome")}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Skip
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveProfileAndContinue}
                    disabled={savingProfile}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---- Welcome ---- */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>
                    <Scale className="w-8 h-8" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                    Welcome to Weight Tracker
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    Your dashboard is empty for now. Let's get your measurements in — you
                    can import a CSV file or add entries manually.
                  </p>
                </div>

                {/* Path selection */}
                <div className="flex flex-col gap-3">
                  <ActionCard
                    variant="onboarding"
                    icon={<FileUp className="w-5 h-5" />}
                    title="Import a CSV file"
                    description="Upload an existing export from a scale app or spreadsheet."
                    onClick={() => setStep("csv")}
                  />
                  <ActionCard
                    variant="onboarding"
                    icon={<PenLine className="w-5 h-5" />}
                    title="Add measurements manually"
                    description="Enter your weight entries one by one."
                    onClick={() => setStep("manual")}
                  />
                </div>

                <Button
                  variant="link"
                  size="sm"
                  onClick={handleSkip}
                  className="self-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Skip for now — I'll add data later
                </Button>
              </motion.div>
            )}

            {/* ---- CSV import ---- */}
            {step === "csv" && (
              <motion.div
                key="csv"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                  Import CSV
                </h2>
                <CsvImport
                  onComplete={handleCsvComplete}
                  onBack={() => setStep("welcome")}
                  accent={accent}
                />
              </motion.div>
            )}

            {/* ---- Manual entry ---- */}
            {step === "manual" && (
              <motion.div
                key="manual"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Add measurements
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add as many entries as you like. Click "Done" when you're ready.
                </p>

                {/* Reuse the existing AddMeasurement form */}
                <AddMeasurement
                  onSuccess={() => setManualCount((n) => n + 1)}
                />

                {manualCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {manualCount} measurement{manualCount !== 1 ? "s" : ""} added
                  </motion.p>
                )}

                <div className="flex gap-3 justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("welcome")}
                  >
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleManualDone}
                  >
                    Done <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---- Done ---- */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-6 text-center py-4"
              >
                <CheckCircle className="w-14 h-14 text-green-500" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                    You're all set!
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
                    {summary.mode === "csv" && summary.csvResult && (
                      <>
                        {summary.csvResult.inserted} measurement
                        {summary.csvResult.inserted !== 1 ? "s" : ""} imported successfully.
                      </>
                    )}
                    {summary.mode === "manual" && (
                      <>
                        {summary.manualCount > 0
                          ? `${summary.manualCount} measurement${summary.manualCount !== 1 ? "s" : ""} added.`
                          : "Your dashboard is ready whenever you are."}
                      </>
                    )}
                    {summary.mode === "skipped" && (
                      <>Head to the Data page to add your measurements whenever you're ready.</>
                    )}
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={onComplete}
                  disabled={isFinishing}
                  className="rounded-xl"
                >
                  Go to dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
