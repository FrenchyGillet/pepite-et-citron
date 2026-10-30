import type { CitronMood, MascotBubble, MascotCatalogue, PepiteMood } from '@/utils/mascots';
import type { Lang } from '@/i18n';

/**
 * What Pépite and Citron say (utils/mascots). French only for now: the puns
 * do not translate, English and Dutch will get their own lines. A language
 * without a catalogue shows no mascot.
 *
 * Tone (docs/mascottes.md): second degree, no exclamation mark, at most one
 * pun per screen, tease the result, never the person. Citron turns into a
 * bad loser with absurd superlatives as soon as votes are involved. Lines
 * about a player stay gender-neutral (mixed teams). A line follows the
 * screen's own title and subtitle, it does not repeat them.
 */

const P = (mood: PepiteMood, text: string): MascotBubble => ({ who: 'pepite', mood, text });
const C = (mood: CitronMood, text: string): MascotBubble => ({ who: 'citron', mood, text });

const fr: MascotCatalogue = {
  upcoming: [
    [C('impassible', "D'ici là, tout le monde est encore pépite.")],
    [P('clin-doeil', "Contrairement à certaines excuses.")],
    [C('impassible', "À la mi-temps, on mange des oranges. Les citrons, on les garde pour la fin.")],
  ],
  noMatch: [
    [C('impassible', "Pas de match, pas d'amertume. Savourez.")],
    [P('fiere', "Aucun match à l'horizon. Je reste disponible pour les interviews.")],
    [C('impassible', "Les chats fuient l'odeur du citron. Les matchs aussi, apparemment.")],
  ],
  voted: [
    [P('clin-doeil', "Ton vote ne quittera pas cette pièce.")],
    [P('clin-doeil', "Ton vote est secret. Le silence est d'or, je m'y connais.")],
    [C('sourire-en-coin', "Ton vote est écrit au jus de citron. Et j'ai confisqué les briquets.")],
    [C('triomphant', "Très beau vote. Un des meilleurs. Les gens en parlent.")],
  ],
  closedNotVoted: [
    [C('impassible', "Le vote est clos. Il fallait te presser.")],
    [P('clin-doeil', "Les urnes sont fermées. Ta voix restera un mystère, même pour toi.")],
  ],
  noResults: [
    [
      C('emu', "En 1849, les chercheurs d'or me payaient un dollar pièce. Aujourd'hui, je commente vos matchs."),
      P('fiere', "Les chercheurs d'or. Donc, mes fans."),
    ],
    [C('impassible', "Pas de résultats. Personne n'a encore déçu personne.")],
    [P('bienveillante', "En attendant, je garde la place au chaud.")],
  ],
  pepiteStreak: [
    [P('ravie', "{pepite}, {pepiteRun}e pépite d'affilée. On tient un filon.")],
    [C('soupconneux', "{pepiteRun} pépites d'affilée. Suspect. Très, très suspect. Des gens enquêtent.")],
    [C('outre', "{pepiteRun} d'affilée. J'aurais pu le faire aussi. On ne m'a pas laissé.")],
  ],
  citronStreak: [
    [C('emu', "{citron}, {citronRun}e citron d'affilée. Loyauté totale. J'adore les gens loyaux.")],
    [
      P('bienveillante', "Il paraît que ça forge le caractère."),
      C('triomphant', "Un caractère énorme. Le plus grand. Des hommes adultes pleurent en le voyant."),
    ],
  ],
  seasonRecord: [
    [P('emerveillee', "Le record de la saison. Je fais encadrer.")],
    [C('triomphant', "Le plus grand record de l'histoire de ce club. Peut-être de tous les clubs.")],
    [C('outre', "Joli record. J'en ai de plus grands. Beaucoup plus grands. On n'en parle jamais.")],
  ],
  seasonPepite: [
    [P('emerveillee', "{pepite}, {pepitePts} points. Ça commence à me faire de l'ombre.")],
    [
      P('ravie', "{pepite} en tête. Une saison en or."),
      C('outre', "J'accepterai le résultat. Quand il me sera favorable."),
    ],
  ],
  seasonCitron: [
    [C('triomphant', "{citron}, {citronPts} points. Une victoire écrasante. Historique. Les gens n'en reviennent pas.")],
    [C('triomphant', "{citron}. C'est moi qui ai lancé sa carrière. Personne n'y croyait. Moi si.")],
    [C('outre', "{citron}, {citronPts} points. On lui a volé la pépite. Tout le monde le sait.")],
  ],
  attendanceLeader: [
    [C('impassible', "{name}, {played} matchs sur {total}. Une présence qui frise l'acharnement.")],
    [C('triomphant', "{name}, {played} sur {total}. Personne n'a jamais été aussi présent. Personne.")],
  ],
  attendancePerfect: [
    [P('fiere', "{name}, présence parfaite. Le talent, c'est d'abord d'être là.")],
  ],
  attendanceTie: [
    [C('impassible', "{count} joueurs à égalité. L'assiduité, ça ne départage personne.")],
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

export const MASCOT_LINES: Partial<Record<Lang, MascotCatalogue>> = { fr };
