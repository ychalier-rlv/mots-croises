# Générateur de mots croisés

Un générateur de mots croisés. Implémentation de [*A prototype crossword compiler* (P.D Smith, S.Y. Steen, 1980)](https://academic.oup.com/comjnl/article-pdf/24/2/107/966926/240107.pdf). Le fonctionnement de l'algorithme et une présentation du projet sont détaillés dans cet article : *[L'auteur de mots croisés](https://atelier-mediatheque.rlv.eu/blog/lauteur-de-mots-croises)*.

## Utilisation

Rendez-vous sur [ychalier.github.io/rlv/crosswords/](https://ychalier.github.io/rlv/crosswords/).

Quelques paramètres GET sont disponibles :

Paramètre | Valeur par défaut | Description
--------- | ----------------- | -----------
`w`       | 13                | Largeur de la grille
`h`       | 9                 | Hauteur de la grille
`p`       | 0.3               | Probabilité d'apparation d'un bloc
`s`       | `null`            | Graine de génération, permet de régénérer plusieurs fois une même grille, et donc de la partager