import type { AuthResource } from "../en/auth";
const auth: AuthResource = {
  login: {
    title: "Weight Tracker",
    tagline:
      "Suivez votre poids, visualisez votre progression et gardez le cap sur vos objectifs — le tout au même endroit.",
    signInWithEmail: "Se connecter par e-mail",
    or: "ou",
    signInWithGoogle: "Se connecter avec Google",
    signInWithGoogleAria: "Se connecter avec votre compte Google",
    footerNote:
      'Nouveau ici ? Choisissez « Se connecter par e-mail » et créez un compte gratuit.',
    attribution: "Weight Tracker — tableau de bord santé personnel",
    about: "À propos",
  },
  callback: {
    completingSignIn: "Connexion en cours…",
  },
};
export default auth;
