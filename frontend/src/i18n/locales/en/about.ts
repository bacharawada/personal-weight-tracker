/**
 * `about` namespace (English — source of truth).
 *
 * Copy for the public AboutPage: version label, app description, and the
 * developer links section.
 */

const about = {
  version: "v{{version}}",
  description:
    "A personal health dashboard for tracking your weight over time. Log measurements, visualise trends with interactive charts, model your progression with an exponential decay fit, and export your data whenever you need it.",
  builtBy: "Built by",
  links: {
    githubName: "@bacharawada",
    githubUrl: "github.com/bacharawada",
    portfolioName: "Portfolio",
    portfolioUrl: "portfolio.bawada.fr",
  },
  backToSignIn: "Back to sign in",
};

export type AboutResource = typeof about;

export default about;
