/**
 * `about` namespace (French).
 *
 * Mirrors the English `about` resource key-for-key.
 */

import type { AboutResource } from "../en/about";

const about: AboutResource = {
  version: "v{{version}}",
  description:
    "Un tableau de bord santé personnel pour suivre votre poids dans le temps. Enregistrez vos mesures, visualisez les tendances avec des graphiques interactifs, modélisez votre progression avec un ajustement à décroissance exponentielle et exportez vos données quand vous le souhaitez.",
  builtBy: "Développé par",
  links: {
    githubName: "@bacharawada",
    githubUrl: "github.com/bacharawada",
    portfolioName: "Portfolio",
    portfolioUrl: "portfolio.bawada.fr",
  },
  backToSignIn: "Retour à la connexion",
};

export default about;
