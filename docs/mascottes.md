# Pépite & Citron : catalogue des répliques (FR)

Les deux mascottes commentent chaque écran. Les répliques ci-dessous ont été relues et validées ligne par ligne, sauf la dernière section (« Nouvelles répliques, à relire »).

Les versions anglaise et néerlandaise sont des adaptations (jeux de mots refaits, mauvais perdant plus discret en anglais) : elles vivent directement dans `src/i18n/mascots.ts`.

- ⭐ **Pépite** : l'étoile du logo. Grandiloquente, mais elle sait qu'elle en fait trop.
- 🍋 **Citron** : pince-sans-rire, lucide, « acide, pas méchant ». De temps en temps, quand il est question de vote, de chiffres ou de défaite, il bascule en mauvais perdant mégalomane, à la Trump (jamais nommé) : « beaucoup de gens le disent », superlatifs absurdes, fraude imaginaire, il récompense la loyauté et s'attribue les mérites. Pas à chaque réplique : la plupart du temps, il est simplement pince-sans-rire.

**Règles**
- Second degré : on sous-entend, fausse solennité, pas de point d'exclamation.
- Un jeu de mots par écran au maximum, dit sans appuyer. Pas de blague de tonton.
- On taquine le résultat, jamais la personne (ni physique, ni niveau, ni vie privée).
- Une réplique ne doit jamais pouvoir se lire comme visant quelqu'un dans l'équipe : on chambre les excuses, pas les gens.
- Le Citron n'est candidat à rien : sa mauvaise foi porte sur le camp de Pépite ou sur ses records, jamais sur sa propre « élection ».
- Une réplique prolonge le titre et le sous-titre de l'écran, elle ne les répète pas.
- Les répliques sur un joueur restent neutres en genre (équipes mixtes).
- Une à deux bulles par écran. La même réplique pour toute l'équipe sur un même match.
- `{pepite}`, `{citron}`, `{n}`… : variables remplies par l'app.
- *En italique* : l'expression du personnage. Elle fait partie de la blague, surtout pour les répliques piquantes.

---

## Vote

### Prochain match programmé, vote pas encore ouvert
- 🍋 *blasé* D'ici là, tout le monde est encore pépite. *(suit le sous-titre « Le vote ouvre à 21:30. »)*
- ⭐ *clin d'œil* Contrairement à certaines excuses. *(suit « Garde ce lien : il sert à chaque match. »)*
- 🍋 *blasé* À la mi-temps, on mange des oranges. Les citrons, on les garde pour la fin.

### Aucun match prévu
- 🍋 *serein* Pas de match, pas d'amertume. Savourez.
- ⭐ *fière* Aucun match à l'horizon. Je reste disponible pour les interviews.
- 🍋 *blasé* Les chats fuient l'odeur du citron. Les matchs aussi, apparemment.

### Le vote vient d'ouvrir
- ⭐ *ravie* Le vote est ouvert. Que la ruée commence.
- 🍋 *sérieux* Un vote, c'est un petit zeste qui compte. / ⭐ *lassée* Il la préparait depuis le début de la saison.
- ⭐ *solennelle* Une pépite, un citron. Choisis avec sagesse. / 🍋 *sourire en coin* Ou avec rancune, on ne juge pas.

### Le vote ferme bientôt (moins de 10 min)
- 🍋 *impassible* Le vote ferme dans {n} minutes. Je ne voudrais pas te presser.
- 🍋 *impassible* Les retardataires, pressez-vous.

### Après avoir voté
- ⭐ *complice* Ton vote ne quittera pas cette pièce.
- ⭐ *clin d'œil* Ton vote est secret. Le silence est d'or, je m'y connais.
- 🍋 *conspirateur* Ton vote est écrit au jus de citron. Et j'ai confisqué les briquets.
- 🍋 *satisfait* Très beau vote. Un des meilleurs. Les gens en parlent.

### Vote fermé, pas voté
- 🍋 *impassible* Le vote est clos. Il fallait te presser.
- ⭐ *mystérieuse* Les urnes sont fermées. Ta voix restera un mystère, même pour toi.

---

## Résultats

### Aucun match récent
- 🍋 *nostalgique* En 1849, les chercheurs d'or me payaient un dollar pièce. Aujourd'hui, je commente vos matchs. / ⭐ *fière* Les chercheurs d'or. Donc, mes fans.
- 🍋 *serein* Pas de résultats. Personne n'a encore déçu personne.
- ⭐ *patiente* En attendant, je garde la place au chaud. *(suit « Les résultats s'afficheront ici… »)*

### Vote en cours, aucun vote reçu
- 🍋 *impassible* Aucun vote pour l'instant. L'élection la plus propre de l'histoire.
- ⭐ *lassée* Zéro vote. Je m'étais pourtant faite belle.
- 🍋 *triomphant* Zéro vote. Le calme avant la plus grande tempête jamais vue. Énorme, la tempête.

### Vote en cours, des votes arrivent *(suit « Résultats masqués » et le compteur, sans le répéter)*
- 🍋 *soupçonneux* On attend les derniers votes. Certains réfléchissent. D'autres complotent. Beaucoup de gens le disent.
- 🍋 *triomphant* Le dépouillement le plus long de l'histoire. Et le plus beau. Les gens adorent attendre.
- 🍋 *sourire en coin* Je connais déjà le résultat. Je ne dirai rien. Pas encore.
- ⭐ *clin d'œil* Patience. Je brille mieux quand on m'a attendue.
- ⭐ *bienveillante* L'or ne se trouve pas en cinq minutes. Les résultats non plus.
- 🍋 *outré* Ça traîne. Quand un résultat tarde, c'est qu'on le trafique. Tout le monde le sait. / ⭐ *lassée* Ou que quelqu'un cherche encore son téléphone.

### Vote en cours, tous les présents ont voté (on attend la clôture)
- 🍋 *triomphant* Cent pour cent de participation. Historique. Des pays entiers nous envient.
- 🍋 *soupçonneux* Tout le monde a voté. Trop beau pour être vrai. J'exige un recomptage avant le comptage.
- ⭐ *ravie* Tous les votes sont là. Il ne manque qu'une main pour ouvrir l'urne.

### Révélation : la pépite du soir (cas général)
- ⭐ *émerveillée* {pepite}. On ne commente pas, on contemple.
- ⭐ *ravie* {pepite} est une mine d'or. {citron}, lui, fait grise mine.
- 🍋 *contrarié* Je n'ai rien trouvé contre {pepite}. Pourtant, j'ai cherché.

### Révélation : le citron du soir (cas général)
- 🍋 *compatissant* Plus de jus en deuxième mi-temps, visiblement.
- 🍋 *protecteur* Avantage du titre : plus aucun chat ne l'approchera.
- 🍋 *impassible* {citron} s'est cru dans Pulpe Fiction.
- 🍋 *sourire en coin* Je ne suis pas méchant. Je suis acide, c'est différent.

### Vote unanime
- ⭐ *émerveillée* Unanimité. Même dans ce pays, c'est donc possible.
- 🍋 *soupçonneux* Un vote aussi propre, ça sent le produit ménager.

### Une voix d'écart
- 🍋 *outré* Une voix d'écart. Il y a eu fraude. Beaucoup de gens le disent. Des gens très bien.
- ⭐ *solennelle* Une voix. Des carrières se sont jouées à moins.

### Égalité
- 🍋 *triomphant* Égalité. La plus belle égalité de l'histoire. Tout le monde le dit.
- ⭐ *magnanime* Deux pépites ce soir. L'or se partage mal, mais il se partage.

### Série de pépites ({n} d'affilée)
- ⭐ *ravie* {pepite}, {n}e pépite d'affilée. On tient un filon.
- 🍋 *soupçonneux* {n} pépites d'affilée. Suspect. Très, très suspect. Des gens enquêtent.
- 🍋 *vexé* {n} d'affilée. J'aurais pu le faire aussi. On ne m'a pas laissé.

### Série de citrons ({n} d'affilée)
- 🍋 *ému* {citron}, {n}e citron d'affilée. Loyauté totale. J'adore les gens loyaux. *(neutre en genre)*
- ⭐ *consolante* Il paraît que ça forge le caractère. / 🍋 *triomphant* Un caractère énorme. Le plus grand. Des hommes adultes pleurent en le voyant.

### Un même joueur reçoit des voix pépite et citron
- 🍋 *pensif* Pépite et citron le même soir. La crise d'identité, je connais : techniquement, je suis une baie. Une très grande baie.
- 🍋 *outré* Des voix pépite, des voix citron. Je propose qu'on arrête de compter.

### Peu de votants
- 🍋 *impassible* {n} votes. Une élection intime.
- ⭐ *fière* Peu de votants, mais des votants de qualité.
- 🍋 *triomphant* {n} votes. Une participation record. Les chiffres disent le contraire, mais les chiffres mentent.

---

## Saison

### Classements masqués pendant le vote *(suit « … pour ne pas influencer les choix. »)*
- 🍋 *sourire en coin* Ne pas influencer le vote. Moi, je n'influence jamais. Je suggère très fortement.
- ⭐ *fière* Le classement est au coffre. Rangé à côté des lingots.
- 🍋 *triomphant* Le classement est gelé. Le plus beau classement jamais gelé. Des experts du froid se déplacent pour le voir.
- 🍋 *outré* On nous cache le classement. Qu'est-ce qu'ils ont à cacher, je pose la question. / ⭐ *clin d'œil* Le résultat de ce soir, justement.

### Pépite de la saison
- ⭐ *faussement inquiète* {pepite}, {pts} points. Ça commence à me faire de l'ombre.
- ⭐ *ravie* {pepite} en tête. Une saison en or. / 🍋 *boudeur* J'accepterai le résultat. Quand il me sera favorable.

### Citron de la saison
- 🍋 *triomphant* {citron}, {pts} points. Une victoire écrasante. Historique. Les gens n'en reviennent pas.
- 🍋 *fier* {citron}. C'est moi qui ai lancé sa carrière. Personne n'y croyait. Moi si.
- 🍋 *outré* {citron}, {pts} points. On lui a volé la pépite. Tout le monde le sait.

**Où ça s'affiche sur la page Saison** : le palmarès commente les séries en cours et le record de la saison ; chaque onglet de classement a sa bulle (Pépite de la saison, Citron de la saison, Assiduité).

### Le plus assidu, un seul joueur en tête
- 🍋 *impassible* {nom}, {n} matchs sur {total}. Une présence qui frise l'acharnement.
- 🍋 *triomphant* {nom}, {n} sur {total}. Personne n'a jamais été aussi présent. Personne.

### Le plus assidu, présence parfaite
- ⭐ *fière* {nom}, présence parfaite. Le talent, c'est d'abord d'être là.

### Le plus assidu, plusieurs ex aequo
- 🍋 *impassible* {n} joueurs à égalité. L'assiduité, ça ne départage personne.

### Record battu
- ⭐ *émerveillée* Le record de la saison. Je fais encadrer. *(palmarès)*
- 🍋 *triomphant* Le plus grand record de l'histoire de ce club. Peut-être de tous les clubs.
- 🍋 *vexé* Joli record. J'en ai de plus grands. Beaucoup plus grands. On n'en parle jamais.

---

## Admin (une bulle discrète, pas plus)

### Match lancé
- 🍋 *triomphant* Match lancé. Un lancement magnifique. Peut-être le meilleur jamais vu.

### Match programmé
- ⭐ *satisfaite* C'est noté. Le vote s'ouvrira tout seul, comme un grand.

---

## Parcours /start (création d'équipe)

Les gens découvrent l'app et ne connaissent pas encore les personnages : répliques courtes, compréhensibles sans connaître le Citron. Une seule bulle, toujours au même endroit au-dessus du formulaire, dans un emplacement de hauteur fixe : elle réagit à ce que fait l'organisateur sans jamais faire bouger les champs pendant la saisie. Pas de mascotte sur les messages d'erreur.

### En haut, avant de taper les joueurs
- ⭐ *ravie* Ce soir, quelqu'un devient une légende. / 🍋 *sourire en coin* Et quelqu'un d'autre, un citron. Un très beau citron.

### Joueurs : pas assez pour voter
- 🍋 *soupçonneux* Trop peu pour voter. On ne peut pas truquer une élection à {n}. Enfin, je crois.

### Joueurs : assez
- ⭐ *ravie* {n} joueurs. {p} pépites, un citron. Le compte est bon.
- 🍋 *triomphant* {n} joueurs. Une équipe magnifique. Peut-être la meilleure.

### Joueurs : liste longue (15 et plus)
- 🍋 *triomphant* {n} joueurs. Une foule énorme. La plus grande jamais vue. Les photos le prouvent.

### Compte organisateur (pendant la saisie)
- 🍋 *ému* Toi, tu as un compte. Les autres votent sans. Un vrai leader. Je t'aime beaucoup.

### Lancement, une réplique par étape
- ⭐ *ravie* On t'ouvre le vestiaire.
- 🍋 *triomphant* On grave le nom sur le trophée. Un trophée énorme. En or, peut-être.
- 🍋 *soupçonneux* J'enregistre les suspects. Il y en a beaucoup. Beaucoup trop.
- 🍋 *triomphant* Ce sera l'élection la plus juste de l'histoire. Probablement.

---

## Erreurs et hors ligne

- 🍋 *impassible* Petit pépin de connexion. On réessaie.
- 🍋 *fatigué* Plus de jus côté réseau. On réessaie dès que ça revient.
- ⭐ *rassurante* Un pépin. Rien de grave, on a connu pire.

---

## Mis de côté
- « À court d'agrumes » : trop blague de tonton.
- /start : « Une minute de formulaire. Une saison de rancunes. », « Bienvenue dans le vestiaire / Essuie tes crampons », « J'ai vérifié. Moi-même. » (incompréhensible sans connaître le Citron), « un traître » dans l'équipe.
- Le braqueur au jus de citron de 1995 : personne ne connaît l'histoire.
- « Je répète mon discours », « tenue de gala » : pas assez drôles.
- Menton et ses 500 000 élastiques : remplacé par le Citron flatteur. À recaser ailleurs ?
- Casanova et le demi-citron : pas pour un écran de vote (équipes de jeunes).
- Anglais et néerlandais : à réécrire plus tard avec des jeux de mots propres à chaque langue, pas à traduire.


---

## Nouvelles répliques, à relire

Ajoutées pour varier les écrans vus à chaque match et moins « trumpiser » le Citron. Classées par situation (le nom de la situation dans `src/i18n/mascots.ts`).

### `upcoming`
- 🍋 *impassible* Pour l'instant, personne n'a raté une passe. Profitez-en.
- ⭐ *fière* Je fais chauffer mon éclat. Ça ne s'improvise pas.
- 🍋 *sourire en coin* Le match n'a pas commencé et j'ai déjà quelques idées. Je les garde au frais.
- ⭐ *bienveillante* Échauffez-vous bien. Les excuses aussi, ça se prépare.
- 🍋 *impassible* Rien n'est joué. C'est le bon moment pour promettre un grand match.

### `noMatch`
- ⭐ *lassée* Pas de match. Je brille dans le vide, c'est un peu triste.
- 🍋 *impassible* Semaine sans match. Les genoux vous remercient.
- 🍋 *sourire en coin* Rien de prévu. Je mûris tranquillement.
- ⭐ *clin d'œil* Profitez du repos. Le talent, ça se repose aussi. Surtout le mien.

### `voted`
- 🍋 *impassible* Vote reçu. Ni repris, ni échangé.
- ⭐ *bienveillante* Merci. Je ne dirai pas pour qui tu as voté. Même si on insiste.
- 🍋 *soupçonneux* Vote rapide. Une conviction, ou une rancune bien préparée.
- ⭐ *ravie* C'est dans l'urne. Maintenant, on fait comme si de rien n'était.
- 🍋 *impassible* Voilà. Tu peux reprendre un air innocent.

### `closedNotVoted`
- 🍋 *sourire en coin* Pas de vote. L'abstention est une opinion. Pas la plus intéressante, mais une opinion.
- ⭐ *bienveillante* Raté pour cette fois. Il y aura un prochain match, donc un prochain citron.
- 🍋 *impassible* Les urnes ont fermé sans toi. Elles s'en remettront.

### `noResults`
- ⭐ *fière* Le trophée attend son premier propriétaire. Il est très patient.
- 🍋 *impassible* Rien à afficher. Le calme avant le premier citron.
- ⭐ *clin d'œil* Page blanche. Comme un carnet d'autographes avant la gloire.

### `waitingNone`
- 🍋 *sourire en coin* Personne n'a encore voté. Tout le monde attend de voir ce que font les autres.
- ⭐ *bienveillante* L'urne est vide. Elle a encore tout son suspense.
- 🍋 *impassible* Zéro vote. Pour l'instant, tout le monde est à égalité. Savourez ce moment.

### `waiting`
- 🍋 *impassible* {count} sur {present}. Les autres sont sous la douche, j'imagine.
- ⭐ *ravie* Les votes arrivent. Je fais semblant de ne pas regarder.
- 🍋 *soupçonneux* {count} sur {present}. Certains votent vite. D'autres négocient.
- 🍋 *sourire en coin* Le suspense monte. Moins vite que la file à la buvette, mais il monte.

### `waitingAll`
- 🍋 *impassible* Tout le monde a voté. On peut ouvrir l'urne, ou attendre la saison prochaine.
- ⭐ *émerveillée* Participation complète. Je suis émue. Un peu.
- 🍋 *sourire en coin* Tous les bulletins sont là. Quelque part, quelqu'un commence à transpirer.

### `seasonHidden`
- 🍋 *impassible* Le classement attend la fin du vote. Comme nous tous.
- ⭐ *clin d'œil* Pas de spoiler. Je suis une star, pas une commère.
- 🍋 *sourire en coin* Classement caché. Ça laisse le temps de préparer les réclamations.

### `pepiteStreak`
- ⭐ *émerveillée* {pepiteRun} d'affilée pour {pepite}. Je commence à me sentir remplaçable.
- 🍋 *impassible* {pepite}, {pepiteRun} fois de suite. À ce stade, ce n'est plus un vote, c'est une habitude.
- ⭐ *clin d'œil* {pepiteRun} pépites d'affilée. Je vais finir par demander des droits d'image.

### `citronStreak`
- 🍋 *impassible* {citronRun} citrons d'affilée pour {citron}. À ce rythme, je vais devoir partager mon nom.
- ⭐ *bienveillante* {citronRun} d'affilée. Les séries finissent toujours par s'arrêter. Statistiquement.
- 🍋 *ému* {citron} garde le titre. D'habitude, je ne m'attache pas.

### `seasonRecord`
- ⭐ *fière* Record de la saison. Je l'ai fait polir.
- 🍋 *impassible* Un record. Rien n'est éternel, sauf les captures d'écran.
- ⭐ *ravie* Record de la saison. On l'affiche au vestiaire, entre la trousse de secours et le tableau tactique.

### `seasonPepite`
- ⭐ *fière* {pepite} mène avec {pepitePts} points. Je surveille ma place.
- 🍋 *impassible* {pepite}, {pepitePts} points. Rien à redire. C'est presque agaçant.
- ⭐ *bienveillante* {pepite} en tête. La saison n'est pas finie, mais le discours peut s'écrire.

### `seasonCitron`
- 🍋 *ému* {citron}, {citronPts} points. Je crois qu'on a beaucoup en commun.
- ⭐ *bienveillante* {citron} en tête. Il reste des matchs pour changer de fruit.
- 🍋 *impassible* {citron}, {citronPts} points. Une régularité exemplaire. Dans la mauvaise colonne.

### `attendanceLeader`
- ⭐ *fière* {name}, {played} sur {total}. Si la présence était un poste, ce serait un titulaire indiscutable.
- 🍋 *sourire en coin* {name}, {played} matchs sur {total}. Je soupçonne un lit de camp au vestiaire.

### `attendancePerfect`
- 🍋 *impassible* {name}, tous les matchs. Aucune excuse utilisée. Elles sont encore sous blister.
- ⭐ *émerveillée* {name}, {total} sur {total}. Je n'ai rien à ajouter. C'est rare, chez moi.

### `attendanceTie`
- ⭐ *bienveillante* {count} ex aequo. Il faudra une plus grande photo.
- 🍋 *sourire en coin* {count} à égalité. Pour départager, je propose un tirage au citron.
