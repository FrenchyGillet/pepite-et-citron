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
  attendanceTie: [
    [C('impassible', "{count} joueurs à égalité. L'assiduité, ça ne départage personne.")],
  ],
};

export const MASCOT_LINES: Partial<Record<Lang, MascotCatalogue>> = { fr };
