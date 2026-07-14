/**
 * ShareSettings — the "Sharing" section of the Settings page.
 *
 * Lets the user enable a public read-only link to their weight dashboard,
 * copy it, regenerate it (invalidating the previous one), or disable sharing
 * entirely. Renders the full section (heading + card) so the page just drops
 * it in.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Copy, RefreshCw, Share2, X } from "lucide-react";
import { createShareLink, getShareStatus, revokeShareLink } from "../../lib/api";
import type { ShareStatus } from "../../lib/types";
import { Button } from "../ui/button";
import { ConfirmModal } from "../modals/ConfirmModal";

type ConfirmAction = "regenerate" | "revoke" | null;

export function ShareSettings() {
  const { t } = useTranslation("settings");

  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  useEffect(() => {
    let cancelled = false;
    getShareStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shareUrl =
    status?.token != null ? `${window.location.origin}/share/${status.token}` : "";

  async function handleEnableOrRegenerate() {
    setBusy(true);
    try {
      const next = await createShareLink();
      setStatus(next);
      setCopied(false);
    } catch {
      setLoadError(true);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    try {
      await revokeShareLink();
      setStatus({ enabled: false, token: null });
      setCopied(false);
    } catch {
      setLoadError(true);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the URL visible
      // so the user can select and copy it manually.
      setCopied(false);
    }
  }

  const isEnabled = status?.enabled === true && status.token != null;

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        {t("share.heading")}
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/60 shrink-0">
            <Share2 size={18} className="text-gray-500 dark:text-gray-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isEnabled ? t("share.on") : t("share.off")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("share.description")}
            </p>
          </div>
        </div>

        {loadError && (
          <p className="text-sm text-red-500">{t("share.loadError")}</p>
        )}

        {status != null && !isEnabled && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleEnableOrRegenerate}
            disabled={busy}
          >
            <Share2 size={15} />
            {t("share.enable")}
          </Button>
        )}

        {isEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t("share.linkLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="flex-1 min-w-0 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-mono truncate"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? t("share.copied") : t("share.copy")}
                </Button>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-3 py-2">
              <AlertTriangle
                size={15}
                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {t("share.warning")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirm("regenerate")}
                disabled={busy}
              >
                <RefreshCw size={15} />
                {t("share.regenerate")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirm("revoke")}
                disabled={busy}
              >
                <X size={15} />
                {t("share.revoke")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirm === "regenerate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("share.regenTitle")}
        description={t("share.regenBody")}
        confirmLabel={t("share.regenConfirm")}
        confirmVariant="primary"
        confirmIcon={<RefreshCw size={15} />}
        onConfirm={handleEnableOrRegenerate}
        loading={busy}
      />
      <ConfirmModal
        open={confirm === "revoke"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("share.revokeTitle")}
        description={t("share.revokeBody")}
        confirmLabel={t("share.revokeConfirm")}
        confirmVariant="destructive"
        confirmIcon={<X size={15} />}
        onConfirm={handleRevoke}
        loading={busy}
      />
    </section>
  );
}
