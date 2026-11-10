import type { CitronMood, MascotBubble, MascotCatalogue, PepiteMood } from '@/utils/mascots';
import type { Lang } from '@/i18n';

/**
 * What Pépite and Citron say (utils/mascots), one catalogue per language.
 * English and Dutch are adaptations, not translations: a pun that does not
 * survive is replaced by one that works in that language.
 *
 * Tone (docs/mascottes.md): second degree, no exclamation mark, at most one
 * pun per screen, tease the result, never the person. Citron is deadpan and
 * acid; now and then, when votes are involved, he turns into a bad loser
 * with absurd superlatives, but not in every line. Lines about a player stay
 * gender-neutral (mixed teams). A line follows the screen's own title and
 * subtitle, it does not repeat them.
 *
 * Each situation only gets the variables listed in mascots.test.ts.
 *
 * French is bundled with the app; English and Dutch (mascots.en.ts,
 * mascots.nl.ts) are loaded with their language (loadLanguage in ./index).
 */

export const P = (mood: PepiteMood, text: string): MascotBubble => ({ who: 'pepite', mood, text });
export const C = (mood: CitronMood, text: string): MascotBubble => ({ who: 'citron', mood, text });

const fr: MascotCatalogue = {
  upcoming: [
    [C('impassible', "D'ici là, tout le monde est encore pépite.")],
    [P('clin-doeil', "Contrairement à certaines excuses.")],
    [C('impassible', "À la mi-temps, on mange des oranges. Les citrons, on les garde pour la fin.")],
    [C('impassible', "Pour l'instant, personne n'a raté une passe. Profitez-en.")],
    [P('fiere', "Je fais chauffer mon éclat. Ça ne s'improvise pas.")],
    [C('sourire-en-coin', "Le match n'a pas commencé et j'ai déjà quelques idées. Je les garde au frais.")],
    [P('bienveillante', "Échauffez-vous bien. Les excuses aussi, ça se prépare.")],
    [C('impassible', "Rien n'est joué. C'est le bon moment pour promettre un grand match.")],
  ],
  noMatch: [
    [C('impassible', "Pas de match, pas d'amertume. Savourez.")],
    [P('fiere', "Aucun match à l'horizon. Je reste disponible pour les interviews.")],
    [C('impassible', "Les chats fuient l'odeur du citron. Les matchs aussi, apparemment.")],
    [P('lassee', "Pas de match. Je brille dans le vide, c'est un peu triste.")],
    [C('impassible', "Semaine sans match. Les genoux vous remercient.")],
    [C('sourire-en-coin', "Rien de prévu. Je mûris tranquillement.")],
    [P('clin-doeil', "Profitez du repos. Le talent, ça se repose aussi. Surtout le mien.")],
  ],
  voted: [
    [P('clin-doeil', "Ton vote ne quittera pas cette pièce.")],
    [P('clin-doeil', "Ton vote est secret. Le silence est d'or, je m'y connais.")],
    [C('sourire-en-coin', "Ton vote est écrit au jus de citron. Et j'ai confisqué les briquets.")],
    [C('triomphant', "Très beau vote. Un des meilleurs. Les gens en parlent.")],
    [C('impassible', "Vote reçu. Ni repris, ni échangé.")],
    [P('bienveillante', "Merci. Je ne dirai pas pour qui tu as voté. Même si on insiste.")],
    [C('soupconneux', "Vote rapide. Une conviction, ou une rancune bien préparée.")],
    [P('ravie', "C'est dans l'urne. Maintenant, on fait comme si de rien n'était.")],
    [C('impassible', "Voilà. Tu peux reprendre un air innocent.")],
  ],
  closedNotVoted: [
    [C('impassible', "Le vote est clos. Il fallait te presser.")],
    [P('clin-doeil', "Les urnes sont fermées. Ta voix restera un mystère, même pour toi.")],
    [C('sourire-en-coin', "Pas de vote. L'abstention est une opinion. Pas la plus intéressante, mais une opinion.")],
    [P('bienveillante', "Raté pour cette fois. Il y aura un prochain match, donc un prochain citron.")],
    [C('impassible', "Les urnes ont fermé sans toi. Elles s'en remettront.")],
  ],
  noResults: [
    [
      C('emu', "En 1849, les chercheurs d'or me payaient un dollar pièce. Aujourd'hui, je commente vos matchs."),
      P('fiere', "Les chercheurs d'or. Donc, mes fans."),
    ],
    [C('impassible', "Pas de résultats. Personne n'a encore déçu personne.")],
    [P('bienveillante', "En attendant, je garde la place au chaud.")],
    [P('fiere', "Le trophée attend son premier propriétaire. Il est très patient.")],
    [C('impassible', "Rien à afficher. Le calme avant le premier citron.")],
    [P('clin-doeil', "Page blanche. Comme un carnet d'autographes avant la gloire.")],
  ],
  // Résultats during the vote: the wait itself is the joke.
  waitingNone: [
    [C('impassible', "Aucun vote pour l'instant. L'élection la plus propre de l'histoire.")],
    [P('lassee', "Zéro vote. Je m'étais pourtant faite belle.")],
    [C('triomphant', "Zéro vote. Le calme avant la plus grande tempête jamais vue. Énorme, la tempête.")],
    [C('sourire-en-coin', "Personne n'a encore voté. Tout le monde attend de voir ce que font les autres.")],
    [P('bienveillante', "L'urne est vide. Elle a encore tout son suspense.")],
    [C('impassible', "Zéro vote. Pour l'instant, tout le monde est à égalité. Savourez ce moment.")],
  ],
  waiting: [
    [C('soupconneux', "On attend les derniers votes. Certains réfléchissent. D'autres complotent. Beaucoup de gens le disent.")],
    [C('triomphant', "Le dépouillement le plus long de l'histoire. Et le plus beau. Les gens adorent attendre.")],
    [C('sourire-en-coin', "Je connais déjà le résultat. Je ne dirai rien. Pas encore.")],
    [P('clin-doeil', "Patience. Je brille mieux quand on m'a attendue.")],
    [P('bienveillante', "L'or ne se trouve pas en cinq minutes. Les résultats non plus.")],
    [
      C('outre', "Ça traîne. Quand un résultat tarde, c'est qu'on le trafique. Tout le monde le sait."),
      P('lassee', "Ou que quelqu'un cherche encore son téléphone."),
    ],
    [C('impassible', "{count} sur {present}. Les autres sont sous la douche, j'imagine.")],
    [P('ravie', "Les votes arrivent. Je fais semblant de ne pas regarder.")],
    [C('soupconneux', "{count} sur {present}. Certains votent vite. D'autres négocient.")],
    [C('sourire-en-coin', "Le suspense monte. Moins vite que la file à la buvette, mais il monte.")],
  ],
  waitingAll: [
    [C('triomphant', "Cent pour cent de participation. Historique. Des pays entiers nous envient.")],
    [C('soupconneux', "Tout le monde a voté. Trop beau pour être vrai. J'exige un recomptage avant le comptage.")],
    [P('ravie', "Tous les votes sont là. Il ne manque qu'une main pour ouvrir l'urne.")],
    [C('impassible', "Tout le monde a voté. On peut ouvrir l'urne, ou attendre la saison prochaine.")],
    [P('emerveillee', "Participation complète. Je suis émue. Un peu.")],
    [C('sourire-en-coin', "Tous les bulletins sont là. Quelque part, quelqu'un commence à transpirer.")],
  ],
  seasonHidden: [
    [C('sourire-en-coin', "Ne pas influencer le vote. Moi, je n'influence jamais. Je suggère très fortement.")],
    [P('fiere', "Le classement est au coffre. Rangé à côté des lingots.")],
    [C('triomphant', "Le classement est gelé. Le plus beau classement jamais gelé. Des experts du froid se déplacent pour le voir.")],
    [
      C('outre', "On nous cache le classement. Qu'est-ce qu'ils ont à cacher, je pose la question."),
      P('clin-doeil', "Le résultat de ce soir, justement."),
    ],
    [C('impassible', "Le classement attend la fin du vote. Comme nous tous.")],
    [P('clin-doeil', "Pas de spoiler. Je suis une star, pas une commère.")],
    [C('sourire-en-coin', "Classement caché. Ça laisse le temps de préparer les réclamations.")],
  ],
  pepiteStreak: [
    [P('ravie', "{pepite}, {pepiteRun}e pépite d'affilée. On tient un filon.")],
    [C('soupconneux', "{pepiteRun} pépites d'affilée. Suspect. Très, très suspect. Des gens enquêtent.")],
    [C('outre', "{pepiteRun} d'affilée. J'aurais pu le faire aussi. On ne m'a pas laissé.")],
    [P('emerveillee', "{pepiteRun} d'affilée pour {pepite}. Je commence à me sentir remplaçable.")],
    [C('impassible', "{pepite}, {pepiteRun} fois de suite. À ce stade, ce n'est plus un vote, c'est une habitude.")],
    [P('clin-doeil', "{pepiteRun} pépites d'affilée. Je vais finir par demander des droits d'image.")],
  ],
  citronStreak: [
    [C('emu', "{citron}, {citronRun}e citron d'affilée. Loyauté totale. J'adore les gens loyaux.")],
    [
      P('bienveillante', "Il paraît que ça forge le caractère."),
      C('triomphant', "Un caractère énorme. Le plus grand. Des hommes adultes pleurent en le voyant."),
    ],
    [C('impassible', "{citronRun} citrons d'affilée pour {citron}. À ce rythme, je vais devoir partager mon nom.")],
    [P('bienveillante', "{citronRun} d'affilée. Les séries finissent toujours par s'arrêter. Statistiquement.")],
    [C('emu', "{citron} garde le titre. D'habitude, je ne m'attache pas.")],
  ],
  seasonRecord: [
    [P('emerveillee', "Le record de la saison. Je fais encadrer.")],
    [C('triomphant', "Le plus grand record de l'histoire de ce club. Peut-être de tous les clubs.")],
    [C('outre', "Joli record. J'en ai de plus grands. Beaucoup plus grands. On n'en parle jamais.")],
    [P('fiere', "Record de la saison. Je l'ai fait polir.")],
    [C('impassible', "Un record. Rien n'est éternel, sauf les captures d'écran.")],
    [P('ravie', "Record de la saison. On l'affiche au vestiaire, entre la trousse de secours et le tableau tactique.")],
  ],
  seasonPepite: [
    [P('emerveillee', "{pepite}, {pepitePts} points. Ça commence à me faire de l'ombre.")],
    [
      P('ravie', "{pepite} en tête. Une saison en or."),
      C('outre', "J'accepterai le résultat. Quand il me sera favorable."),
    ],
    [P('fiere', "{pepite} mène avec {pepitePts} points. Je surveille ma place.")],
    [C('impassible', "{pepite}, {pepitePts} points. Rien à redire. C'est presque agaçant.")],
    [P('bienveillante', "{pepite} en tête. La saison n'est pas finie, mais le discours peut s'écrire.")],
  ],
  seasonCitron: [
    [C('triomphant', "{citron}, {citronPts} points. Une victoire écrasante. Historique. Les gens n'en reviennent pas.")],
    [C('triomphant', "{citron}. C'est moi qui ai lancé sa carrière. Personne n'y croyait. Moi si.")],
    [C('outre', "{citron}, {citronPts} points. On lui a volé la pépite. Tout le monde le sait.")],
    [C('emu', "{citron}, {citronPts} points. Je crois qu'on a beaucoup en commun.")],
    [P('bienveillante', "{citron} en tête. Il reste des matchs pour changer de fruit.")],
    [C('impassible', "{citron}, {citronPts} points. Une régularité exemplaire. Dans la mauvaise colonne.")],
  ],
  attendanceLeader: [
    [C('impassible', "{name}, {played} matchs sur {total}. Une présence qui frise l'acharnement.")],
    [C('triomphant', "{name}, {played} sur {total}. Personne n'a jamais été aussi présent. Personne.")],
    [P('fiere', "{name}, {played} sur {total}. Si la présence était un poste, ce serait un titulaire indiscutable.")],
    [C('sourire-en-coin', "{name}, {played} matchs sur {total}. Je soupçonne un lit de camp au vestiaire.")],
  ],
  attendancePerfect: [
    [P('fiere', "{name}, présence parfaite. Le talent, c'est d'abord d'être là.")],
    [C('impassible', "{name}, tous les matchs. Aucune excuse utilisée. Elles sont encore sous blister.")],
    [P('emerveillee', "{name}, {total} sur {total}. Je n'ai rien à ajouter. C'est rare, chez moi.")],
  ],
  attendanceTie: [
    [C('impassible', "{count} joueurs à égalité. L'assiduité, ça ne départage personne.")],
    [P('bienveillante', "{count} ex aequo. Il faudra une plus grande photo.")],
    [C('sourire-en-coin', "{count} à égalité. Pour départager, je propose un tirage au citron.")],
  ],
  // /start: people discover the app and do not know the characters yet, so
  // the lines must read right without knowing Citron.
  startIntro: [
    [
      P('ravie', "Ce soir, quelqu'un devient une légende."),
      C('sourire-en-coin', "Et quelqu'un d'autre, un citron. Un très beau citron."),
    ],
  ],
  startFew: [
    [C('soupconneux', "Trop peu pour voter. On ne peut pas truquer une élection à {count}. Enfin, je crois.")],
  ],
  startReady: [
    [P('ravie', "{count} joueurs. {pepites} pépites, un citron. Le compte est bon.")],
    [C('triomphant', "{count} joueurs. Une équipe magnifique. Peut-être la meilleure.")],
  ],
  startMany: [
    [C('triomphant', "{count} joueurs. Une foule énorme. La plus grande jamais vue. Les photos le prouvent.")],
  ],
  startAccount: [
    [C('emu', "Toi, tu as un compte. Les autres votent sans. Un vrai leader. Je t'aime beaucoup.")],
  ],
  startStepAccount: [[P('ravie', "On t'ouvre le vestiaire.")]],
  startStepTeam: [[C('triomphant', "On grave le nom sur le trophée. Un trophée énorme. En or, peut-être.")]],
  startStepPlayers: [[C('soupconneux', "J'enregistre les suspects. Il y en a beaucoup. Beaucoup trop.")]],
  startStepMatch: [[C('triomphant', "Ce sera l'élection la plus juste de l'histoire. Probablement.")]],
};

/** Filled by loadLanguage (./index) for English and Dutch. */
export const MASCOT_LINES: Partial<Record<Lang, MascotCatalogue>> = { fr };
