/**
 * AboutPage — public page with app info, version, and developer links.
 *
 * Accessible without authentication. Linked from the login page and
 * from the About section at the bottom of the Settings page.
 */

import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { BarChart2, ArrowLeft, Github, Globe } from "lucide-react";
import { Button } from "../components/ui/button";

const APP_VERSION = "1.0.0";

export function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 flex flex-col gap-8"
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-400/10">
            <BarChart2 className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Weight Tracker
            </h1>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              v{APP_VERSION}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          A personal health dashboard for tracking your weight over time.
          Log measurements, visualise trends with interactive charts, model
          your progression with an exponential decay fit, and export your
          data whenever you need it.
        </p>

        {/* Developer */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 text-center">
            Built by
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://github.com/bacharawada"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors group"
            >
              <Github
                size={18}
                className="shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  @bacharawada
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  github.com/bacharawada
                </p>
              </div>
            </a>

            <a
              href="https://portfolio.bawada.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors group"
            >
              <Globe
                size={18}
                className="shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Portfolio
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  portfolio.bawada.fr
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* Back to login */}
        <Button variant="ghost" size="sm" asChild className="self-center">
          <Link to="/login">
            <ArrowLeft size={15} />
            Back to sign in
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
