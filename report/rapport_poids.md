# Rapport d'analyse — Progression du poids corporel
**Période** : 1er juin 2025 → 23 avril 2026  
**n** = 32 mesures · Δw total = **−31,8 kg** · Durée = 326 jours

---

## 1. Méthodologie & traitement des données

### Nettoyage
Les données brutes ont été parsées en timestamps ISO 8601 puis triées chronologiquement. En l'absence de doublons sur la même date, aucune agrégation n'a été nécessaire. L'axe temporel est un axe **datetime continu** — les espacements visuels entre les points reflètent fidèlement les intervalles réels (2 jours ≠ 10 jours visuellement).

### Lissage — Moyenne mobile centrée (fenêtre 5 points)
Pour extraire la tendance sans introduire de lag, une **rolling mean centrée** à 5 points a été appliquée. Elle préserve les ruptures de pente et n'invente pas de continuité là où il n't y en a pas. Une LOWESS aurait donné un résultat visuellement proche mais computationnellement plus coûteux — la rolling mean suffit ici vu la densité des données.

### Dérivée temporelle (Panel 2)
La vitesse de perte est calculée comme :

```
dw/dt = Δpoids (kg) / Δt (jours) × 7  →  kg/semaine
```

Contrairement à une dérivée index-based (qui ignorerait les gaps), cette formule respecte la physique réelle : un −1 kg en 3 jours est traité comme un régime très différent d'un −1 kg en 21 jours.

### Modèle paramétrique — Décroissance exponentielle
Le modèle ajusté est :

```
w(t) = a · exp(−b·t) + c
```

Ajustement par **curve_fit (Levenberg-Marquardt)** sur les paramètres `a`, `b`, `c`. Ce modèle correspond à la physiologie attendue : la perte de poids ralentit à mesure que le poids diminue (moins de masse = moins de calories brûlées au repos). Le Panel 3 montre les **résidus** `w_réel − w_modèle`, ce qui permet d'identifier les zones de sur- et sous-performance par rapport à la trajectoire théorique.

---

## 2. Interprétation des courbes

### Panel 1 — Trajectoire globale

La descente est **remarquablement régulière**. Il n'y a pas de rebond significatif sur 10 mois, ce qui est rare et indique une adhérence comportementale solide.

On distingue néanmoins trois phases :

| Phase | Période | Rythme estimé |
|---|---|---|
| **Phase 1 — Démarrage rapide** | Juin → Août 2025 | ~−0,9 kg/sem |
| **Phase 2 — Croisière stable** | Août → Décembre 2025 | ~−0,7 kg/sem |
| **Phase 3 — Ralentissement progressif** | Janvier → Avril 2026 | ~−0,45 kg/sem |

Ce ralentissement en Phase 3 est **physiologiquement normal** et prédit par le modèle exponentiel : un corps plus léger a un métabolisme de base plus bas, donc un même déficit calorique produit une perte moindre. Ce n'est pas un échec — c'est de la thermodynamique.

La **moyenne mobile dorée** confirme que la tendance n'a jamais été interrompue structurellement. Chaque "plateau apparent" à l'œil nu se révèle être une simple décélération passagère sur la rolling mean.

### Panel 2 — Vitesse de perte (kg/semaine)

Le graphique en barres révèle plusieurs choses importantes :

- **Août 2025 (8–12)** : pic de perte le plus intense de toute la série (~−2,5 kg/sem sur quelques jours). C'est une valeur outlier — probablement une combinaison de rétention hydrique libérée, d'un contexte particulier (effort intense, chaleur estivale, changement alimentaire ponctuel).
- **Septembre → Octobre 2025** : le rythme se stabilise dans une fourchette saine de −0,5 à −0,8 kg/sem.
- **Janvier 2026** : mini-plateau visible — la barre de taux flirte avec 0. C'est la zone de stagnation identifiée dans les résidus.
- **Tendance de fond** : la courbe lissée du taux descend doucement vers zéro, ce qui est cohérent avec une convergence asymptotique vers un poids d'équilibre.

### Panel 3 — Résidus vs modèle exponentiel

C'est le panel le plus analytiquement riche.

- **Zones dorées (résidu > 0)** : le poids réel est **au-dessus** de ce que prédit le modèle → zones de plateau ou de résistance. On en identifie deux : fin juin/début juillet 2025 (démarrage peut-être plus lent que prévu) et **janvier 2026** (stagnation nette ~3 semaines).
- **Zones vertes (résidu < 0)** : le poids réel est **en dessous** du modèle → accélérations. Le cluster d'août 2025 ressort très clairement, ainsi que la fin de période (mars–avril 2026) qui performe légèrement mieux que prédit.
- **Faible amplitude globale des résidus** (~±1–2 kg max) : le modèle exponentiel est un bon fit. Les déviations sont mineures, ce qui confirme que la trajectoire est cohérente et prédictible.

---

## 3. Prédiction

### Projection du modèle exponentiel

En prolongeant `w(t) = a · exp(−b·t) + c` au-delà du 23 avril 2026, on obtient les estimations suivantes (sous hypothèse de continuité comportementale) :

| Horizon | Poids prédit |
|---|---|
| 1 juin 2026 (dans ~5 sem) | **~149,5 kg** |
| 1 septembre 2026 (dans ~5 mois) | **~145–146 kg** |
| Asymptote `c` du modèle | **~140–142 kg** |

> ⚠️ L'asymptote `c` est le poids vers lequel la courbe converge **si les conditions restent identiques**. C'est une limite mathématique, pas nécessairement un poids d'équilibre réel — mais elle donne un ordre de grandeur de la destination naturelle de cette trajectoire.

### Limites de la prédiction

Le modèle exponentiel suppose une décroissance continue sans perturbation. En pratique, plusieurs facteurs peuvent modifier la trajectoire :

1. **Adaptation métabolique** : le corps peut abaisser son métabolisme de base au-delà de ce que le modèle prédit, accentuant le plateau.
2. **Effets de seuil** : certains paliers physiologiques (masse musculaire, hormones, hydratation) génèrent des stagnations non capturées par le modèle lisse.
3. **Changements comportementaux** : reprise d'un traitement, changement d'alimentation, blessure, stress — tout cela peut faire dévier le résidu de façon non prédictible.

### Recommandation analytique

Le rythme actuel (~−0,45 kg/sem en avril 2026) est **dans la zone verte cliniquement** (0,25–0,75 kg/sem = perte saine sans catabolisme musculaire excessif). La décélération observée est normale et attendue. Il n'y a **aucun signal d'alarme** dans les données — la variance des résidus est faible et le modèle reste un bon descripteur.

---

## 4. Résumé en une phrase

> Une trajectoire de perte de poids sur 10 mois d'une régularité exceptionnelle (−31,8 kg, σ des résidus < 2 kg), bien décrite par un modèle de décroissance exponentielle, avec un ralentissement physiologique attendu en fin de période et une asymptote modélisée autour de 140–142 kg.

---

*Analyse générée avec Python · pandas · matplotlib · scipy.optimize · scipy.stats*
