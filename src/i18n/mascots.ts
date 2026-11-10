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
 */

const P = (mood: PepiteMood, text: string): MascotBubble => ({ who: 'pepite', mood, text });
const C = (mood: CitronMood, text: string): MascotBubble => ({ who: 'citron', mood, text });

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

/**
 * English: Citron's bad-loser streak is lighter here, the tics are easier to
 * spot for English speakers. Lemon puns (sour, squeeze, zest) replace the
 * French ones.
 */
const en: MascotCatalogue = {
  upcoming: [
    [C('impassible', "Until then, everyone is still a pépite.")],
    [P('clin-doeil', "Unlike some excuses.")],
    [C('impassible', "At half-time you eat oranges. Lemons are saved for the end.")],
    [C('impassible', "So far, nobody has missed a pass. Enjoy it.")],
    [P('fiere', "I'm warming up my shine. It doesn't happen by itself.")],
    [C('sourire-en-coin', "The match hasn't started and I already have a few ideas. I'm keeping them chilled.")],
    [P('bienveillante', "Warm up properly. Excuses need warming up too.")],
    [C('impassible', "Nothing is decided yet. The perfect time to promise a big game.")],
  ],
  noMatch: [
    [C('impassible', "No match, no bitterness. Enjoy.")],
    [P('fiere', "No match in sight. I remain available for interviews.")],
    [C('impassible', "Cats run from the smell of lemon. Matches too, apparently.")],
    [P('lassee', "No match. I'm shining at nobody. It's a bit sad.")],
    [C('impassible', "A week off. Your knees say thank you.")],
    [C('sourire-en-coin', "Nothing planned. I'm ripening quietly.")],
    [P('clin-doeil', "Enjoy the rest. Talent needs rest too. Mine especially.")],
  ],
  voted: [
    [P('clin-doeil', "Your vote won't leave this room.")],
    [P('clin-doeil', "Your vote is secret. Silence is golden, I would know.")],
    [C('sourire-en-coin', "Your vote is written in lemon juice. And I've hidden the lighters.")],
    [C('triomphant', "Beautiful vote. One of the best. People are talking about it.")],
    [C('impassible', "Vote received. No refunds, no exchanges.")],
    [P('bienveillante', "Thank you. I won't say who you voted for. Not even if they insist.")],
    [C('soupconneux', "Quick vote. Either a conviction, or a well-prepared grudge.")],
    [P('ravie', "It's in the box. Now we all act natural.")],
    [C('impassible', "There. You can put your innocent face back on.")],
  ],
  closedNotVoted: [
    [C('impassible', "The vote is closed. You had to be quicker.")],
    [P('clin-doeil', "The ballot box is shut. Your vote will stay a mystery, even to you.")],
    [C('sourire-en-coin', "No vote. Abstaining is an opinion. Not the most interesting one, but an opinion.")],
    [P('bienveillante', "Missed it this time. There will be another match, so another citron.")],
    [C('impassible', "The ballot box closed without you. It will get over it.")],
  ],
  noResults: [
    [
      C('emu', "In 1849, gold diggers paid a dollar for me. Now I comment on your matches."),
      P('fiere', "Gold diggers. So, my fans."),
    ],
    [C('impassible', "No results. Nobody has disappointed anybody yet.")],
    [P('bienveillante', "Meanwhile, I'm keeping the spot warm.")],
    [P('fiere', "The trophy is waiting for its first owner. It's very patient.")],
    [C('impassible', "Nothing to show. The calm before the first citron.")],
    [P('clin-doeil', "A blank page. Like an autograph book before the fame.")],
  ],
  waitingNone: [
    [C('impassible', "No votes yet. The cleanest election in history.")],
    [P('lassee', "Zero votes. And I made such an effort.")],
    [C('triomphant', "Zero votes. The calm before the biggest storm ever seen. Huge storm.")],
    [C('sourire-en-coin', "Nobody has voted yet. Everyone is waiting to see what the others do.")],
    [P('bienveillante', "The ballot box is empty. It still has all its suspense.")],
    [C('impassible', "Zero votes. Right now, everyone is tied. Savour it.")],
  ],
  waiting: [
    [C('soupconneux', "Waiting for the last votes. Some are thinking. Others are plotting. Many people are saying it.")],
    [C('sourire-en-coin', "I already know the result. I'm not saying anything. Not yet.")],
    [P('clin-doeil', "Patience. I shine brighter when people have waited for me.")],
    [P('bienveillante', "Gold isn't found in five minutes. Neither are results.")],
    [
      C('outre', "This is dragging. When a result is late, someone is fiddling with it."),
      P('lassee', "Or someone is still looking for their phone."),
    ],
    [C('impassible', "{count} out of {present}. The rest are in the shower, I assume.")],
    [P('ravie', "The votes are coming in. I'm pretending not to look.")],
    [C('soupconneux', "{count} out of {present}. Some vote fast. Others negotiate.")],
    [C('sourire-en-coin', "The suspense is rising. Slower than the queue at the bar, but rising.")],
  ],
  waitingAll: [
    [C('triomphant', "One hundred percent turnout. Historic. Whole countries are jealous.")],
    [C('soupconneux', "Everyone voted. Too good to be true. I demand a recount before the count.")],
    [P('ravie', "All the votes are in. It just needs someone to open the box.")],
    [C('impassible', "Everyone voted. We can open the box, or wait for next season.")],
    [P('emerveillee', "Full turnout. I'm moved. A little.")],
    [C('sourire-en-coin', "Every ballot is in. Somewhere, someone is starting to sweat.")],
  ],
  seasonHidden: [
    [C('sourire-en-coin', "Not influencing the vote. I never influence. I suggest, very strongly.")],
    [P('fiere', "The rankings are in the vault. Next to the gold bars.")],
    [
      C('outre', "They're hiding the rankings from us. What are they hiding, I'm just asking."),
      P('clin-doeil', "Tonight's result, precisely."),
    ],
    [C('impassible', "The rankings are waiting for the vote to end. Like the rest of us.")],
    [P('clin-doeil', "No spoilers. I'm a star, not a gossip.")],
    [C('sourire-en-coin', "Rankings hidden. Plenty of time to prepare the complaints.")],
  ],
  pepiteStreak: [
    [P('ravie', "{pepite}, {pepiteRun} pépites in a row. We've struck a seam.")],
    [C('soupconneux', "{pepiteRun} pépites in a row. Suspicious. Very, very suspicious. People are looking into it.")],
    [C('outre', "{pepiteRun} in a row. I could have done that. Nobody let me.")],
    [P('emerveillee', "{pepiteRun} in a row for {pepite}. I'm starting to feel replaceable.")],
    [C('impassible', "{pepite}, {pepiteRun} times running. At this point it's not a vote, it's a habit.")],
    [P('clin-doeil', "{pepiteRun} pépites in a row. I'll have to ask for image rights.")],
  ],
  citronStreak: [
    [C('emu', "{citron}, {citronRun} citrons in a row. Total loyalty. I love loyal people.")],
    [
      P('bienveillante', "They say it builds character."),
      C('triomphant', "A huge character. The biggest. Grown adults cry when they see it."),
    ],
    [C('impassible', "{citronRun} citrons in a row for {citron}. At this rate I'll have to share my name.")],
    [P('bienveillante', "{citronRun} in a row. Streaks always end. Statistically.")],
    [C('emu', "{citron} keeps the title. I don't usually get attached.")],
  ],
  seasonRecord: [
    [P('emerveillee', "The season record. I'm having it framed.")],
    [C('triomphant', "The greatest record in the history of this club. Maybe of all clubs.")],
    [C('outre', "Nice record. I have bigger ones. Much bigger. Nobody ever mentions them.")],
    [P('fiere', "Season record. I had it polished.")],
    [C('impassible', "A record. Nothing lasts forever, except screenshots.")],
    [P('ravie', "Season record. It goes on the dressing-room wall, between the first-aid kit and the tactics board.")],
  ],
  seasonPepite: [
    [P('emerveillee', "{pepite}, {pepitePts} points. I'm starting to feel overshadowed.")],
    [
      P('ravie', "{pepite} on top. A golden season."),
      C('outre', "I will accept the result. When it suits me."),
    ],
    [P('fiere', "{pepite} leads with {pepitePts} points. I'm keeping an eye on my spot.")],
    [C('impassible', "{pepite}, {pepitePts} points. Nothing to say. It's almost annoying.")],
    [P('bienveillante', "{pepite} on top. The season isn't over, but the speech can be drafted.")],
  ],
  seasonCitron: [
    [C('triomphant', "{citron}, {citronPts} points. A landslide. Historic. People can't believe it.")],
    [C('triomphant', "{citron}. I launched that career. Nobody believed in it. I did.")],
    [C('emu', "{citron}, {citronPts} points. I think we have a lot in common.")],
    [P('bienveillante', "{citron} on top. There are matches left to change fruit.")],
    [C('impassible', "{citron}, {citronPts} points. Remarkably consistent. In the wrong column.")],
  ],
  attendanceLeader: [
    [C('impassible', "{name}, {played} matches out of {total}. Presence bordering on stubbornness.")],
    [P('fiere', "{name}, {played} out of {total}. If showing up were a position, it would be a first-team spot.")],
    [C('sourire-en-coin', "{name}, {played} matches out of {total}. I suspect a camp bed in the dressing room.")],
  ],
  attendancePerfect: [
    [P('fiere', "{name}, perfect attendance. Talent starts with turning up.")],
    [C('impassible', "{name}, every match. Not a single excuse used. They're still in the wrapper.")],
    [P('emerveillee', "{name}, {total} out of {total}. I have nothing to add. That's rare for me.")],
  ],
  attendanceTie: [
    [C('impassible', "{count} players tied. Attendance doesn't separate anyone.")],
    [P('bienveillante', "{count} level at the top. We'll need a wider photo.")],
    [C('sourire-en-coin', "{count} tied. To settle it, I suggest squeezing a lemon.")],
  ],
  startIntro: [
    [
      P('ravie', "Tonight, someone becomes a legend."),
      C('sourire-en-coin', "And someone else, a citron. A very fine citron."),
    ],
  ],
  startFew: [
    [C('soupconneux', "Too few to vote. You can't rig an election with {count}. I think.")],
  ],
  startReady: [
    [P('ravie', "{count} players. {pepites} pépites, one citron. The numbers add up.")],
    [C('triomphant', "{count} players. A magnificent team. Maybe the best.")],
  ],
  startMany: [
    [C('impassible', "{count} players. We'll need a bigger ballot box.")],
  ],
  startAccount: [
    [C('emu', "You have an account. The others vote without one. A true leader. I like you a lot.")],
  ],
  startStepAccount: [[P('ravie', "Opening the dressing room for you.")]],
  startStepTeam: [[C('triomphant', "Engraving the name on the trophy. A huge trophy. Gold, maybe.")]],
  startStepPlayers: [[C('soupconneux', "Registering the suspects. There are many. Far too many.")]],
  startStepMatch: [[C('triomphant', "This will be the fairest election in history. Probably.")]],
};

/**
 * Dutch (Belgium): je-vorm, « ploeg », « match », « kleedkamer », « toog ».
 * Lemon puns play on « zuur » and « citroen ».
 */
const nl: MascotCatalogue = {
  upcoming: [
    [C('impassible', "Tot dan is iedereen nog een pépite.")],
    [P('clin-doeil', "In tegenstelling tot sommige excuses.")],
    [C('impassible', "Tijdens de rust eet je appelsienen. De citroenen houden we voor het einde.")],
    [C('impassible', "Voorlopig heeft nog niemand een pass gemist. Geniet ervan.")],
    [P('fiere', "Ik warm mijn glans op. Dat gaat niet vanzelf.")],
    [C('sourire-en-coin', "De match is nog niet begonnen en ik heb al wat ideeën. Ik hou ze koel.")],
    [P('bienveillante', "Warm goed op. Excuses moeten ook opgewarmd worden.")],
    [C('impassible', "Er is nog niets beslist. Het ideale moment om een grote match te beloven.")],
  ],
  noMatch: [
    [C('impassible', "Geen match, geen zure gezichten. Geniet ervan.")],
    [P('fiere', "Geen match in zicht. Ik blijf beschikbaar voor interviews.")],
    [C('impassible', "Katten vluchten voor de geur van citroen. Matchen ook, blijkbaar.")],
    [P('lassee', "Geen match. Ik schitter voor niemand. Een beetje triest.")],
    [C('impassible', "Een week zonder match. Je knieën bedanken je.")],
    [C('sourire-en-coin', "Niets gepland. Ik rijp rustig verder.")],
    [P('clin-doeil', "Geniet van de rust. Talent moet ook rusten. Vooral het mijne.")],
  ],
  voted: [
    [P('clin-doeil', "Je stem verlaat deze kamer niet.")],
    [P('clin-doeil', "Je stem is geheim. Zwijgen is goud, daar ken ik iets van.")],
    [C('sourire-en-coin', "Je stem is geschreven met citroensap. En ik heb de aanstekers in beslag genomen.")],
    [C('triomphant', "Heel mooie stem. Een van de beste. De mensen praten erover.")],
    [C('impassible', "Stem ontvangen. Niet terugnemen, niet ruilen.")],
    [P('bienveillante', "Dank je. Ik zeg niet op wie je gestemd hebt. Ook niet als ze aandringen.")],
    [C('soupconneux', "Snel gestemd. Een overtuiging, of een goed voorbereide wrok.")],
    [P('ravie', "Het zit in de bus. Nu doen we allemaal heel normaal.")],
    [C('impassible', "Zo. Je mag je onschuldige gezicht weer opzetten.")],
  ],
  closedNotVoted: [
    [C('impassible', "De stemming is gesloten. Je had sneller moeten zijn.")],
    [P('clin-doeil', "De stembus is dicht. Je stem blijft een mysterie, zelfs voor jou.")],
    [C('sourire-en-coin', "Geen stem. Je onthouden is ook een mening. Niet de boeiendste, maar toch.")],
    [P('bienveillante', "Deze keer gemist. Er komt een volgende match, dus een volgende citron.")],
    [C('impassible', "De stembus is zonder jou gesloten. Ze komt er wel overheen.")],
  ],
  noResults: [
    [
      C('emu', "In 1849 betaalden goudzoekers een dollar voor mij. Nu becommentarieer ik jullie matchen."),
      P('fiere', "Goudzoekers. Dus mijn fans."),
    ],
    [C('impassible', "Geen resultaten. Niemand heeft nog iemand teleurgesteld.")],
    [P('bienveillante', "Intussen hou ik de plaats warm.")],
    [P('fiere', "De trofee wacht op een eerste eigenaar. Ze is heel geduldig.")],
    [C('impassible', "Niets te zien. De stilte voor de eerste citron.")],
    [P('clin-doeil', "Een leeg blad. Zoals een handtekeningenboekje voor de roem.")],
  ],
  waitingNone: [
    [C('impassible', "Nog geen enkele stem. De properste verkiezing uit de geschiedenis.")],
    [P('lassee', "Nul stemmen. En ik had me nog zo mooi gemaakt.")],
    [C('triomphant', "Nul stemmen. De stilte voor de grootste storm ooit. Een enorme storm.")],
    [C('sourire-en-coin', "Nog niemand heeft gestemd. Iedereen wacht af wat de anderen doen.")],
    [P('bienveillante', "De stembus is leeg. Ze heeft nog al haar spanning.")],
    [C('impassible', "Nul stemmen. Voorlopig staat iedereen gelijk. Geniet ervan.")],
  ],
  waiting: [
    [C('soupconneux', "We wachten op de laatste stemmen. Sommigen denken na. Anderen smeden plannen. Veel mensen zeggen het.")],
    [C('sourire-en-coin', "Ik ken de uitslag al. Ik zeg niets. Nog niet.")],
    [P('clin-doeil', "Geduld. Ik schitter beter als men op me gewacht heeft.")],
    [P('bienveillante', "Goud vind je niet in vijf minuten. Uitslagen ook niet.")],
    [
      C('outre', "Het duurt lang. Als een uitslag op zich laat wachten, wordt er geknoeid. Iedereen weet het."),
      P('lassee', "Of er zoekt nog iemand een gsm."),
    ],
    [C('impassible', "{count} van de {present}. De rest staat onder de douche, neem ik aan.")],
    [P('ravie', "De stemmen komen binnen. Ik doe alsof ik niet kijk.")],
    [C('soupconneux', "{count} van de {present}. Sommigen stemmen snel. Anderen onderhandelen.")],
    [C('sourire-en-coin', "De spanning stijgt. Trager dan de rij aan de toog, maar ze stijgt.")],
  ],
  waitingAll: [
    [C('triomphant', "Honderd procent opkomst. Historisch. Hele landen zijn jaloers.")],
    [C('soupconneux', "Iedereen heeft gestemd. Te mooi om waar te zijn. Ik eis een hertelling voor de telling.")],
    [P('ravie', "Alle stemmen zijn binnen. Nu nog iemand die de bus opent.")],
    [C('impassible', "Iedereen heeft gestemd. We kunnen de bus openen, of wachten tot volgend seizoen.")],
    [P('emerveillee', "Volledige opkomst. Ik ben ontroerd. Een beetje.")],
    [C('sourire-en-coin', "Alle stembriefjes zijn binnen. Ergens begint iemand te zweten.")],
  ],
  seasonHidden: [
    [C('sourire-en-coin', "De stemming niet beïnvloeden. Ik beïnvloed nooit. Ik suggereer heel sterk.")],
    [P('fiere', "Het klassement zit in de kluis. Naast de goudstaven.")],
    [
      C('outre', "Ze verbergen het klassement voor ons. Wat hebben ze te verbergen, ik vraag het maar."),
      P('clin-doeil', "De uitslag van vanavond, net."),
    ],
    [C('impassible', "Het klassement wacht op het einde van de stemming. Net als wij.")],
    [P('clin-doeil', "Geen spoilers. Ik ben een ster, geen roddeltante.")],
    [C('sourire-en-coin', "Klassement verborgen. Tijd genoeg om de klachten voor te bereiden.")],
  ],
  pepiteStreak: [
    [P('ravie', "{pepite}, {pepiteRun} pépites op rij. We hebben een goudader.")],
    [C('soupconneux', "{pepiteRun} pépites op rij. Verdacht. Heel, heel verdacht. Er wordt onderzoek gedaan.")],
    [C('outre', "{pepiteRun} op rij. Dat had ik ook gekund. Ze lieten me niet.")],
    [P('emerveillee', "{pepiteRun} op rij voor {pepite}. Ik begin me vervangbaar te voelen.")],
    [C('impassible', "{pepite}, {pepiteRun} keer na elkaar. Dat is geen stemming meer, dat is een gewoonte.")],
    [P('clin-doeil', "{pepiteRun} pépites op rij. Ik ga beeldrechten moeten vragen.")],
  ],
  citronStreak: [
    [C('emu', "{citron}, {citronRun} citrons op rij. Totale loyaliteit. Ik hou van loyale mensen.")],
    [
      P('bienveillante', "Ze zeggen dat het karakter vormt."),
      C('triomphant', "Een enorm karakter. Het grootste. Volwassen mensen huilen als ze het zien."),
    ],
    [C('impassible', "{citronRun} citrons op rij voor {citron}. Zo moet ik straks mijn naam delen.")],
    [P('bienveillante', "{citronRun} op rij. Reeksen stoppen altijd. Statistisch gezien.")],
    [C('emu', "{citron} houdt de titel. Normaal hecht ik me niet.")],
  ],
  seasonRecord: [
    [P('emerveillee', "Het record van het seizoen. Ik laat het inkaderen.")],
    [C('triomphant', "Het grootste record in de geschiedenis van deze club. Misschien van alle clubs.")],
    [C('outre', "Mooi record. Ik heb er grotere. Veel grotere. Daar spreekt nooit iemand over.")],
    [P('fiere', "Seizoensrecord. Ik heb het laten oppoetsen.")],
    [C('impassible', "Een record. Niets is eeuwig, behalve screenshots.")],
    [P('ravie', "Seizoensrecord. Het komt aan de muur van de kleedkamer, tussen de EHBO-koffer en het tactiekbord.")],
  ],
  seasonPepite: [
    [P('emerveillee', "{pepite}, {pepitePts} punten. Ik begin in de schaduw te staan.")],
    [
      P('ravie', "{pepite} aan de leiding. Een gouden seizoen."),
      C('outre', "Ik aanvaard de uitslag. Als ze me goed uitkomt."),
    ],
    [P('fiere', "{pepite} leidt met {pepitePts} punten. Ik hou mijn plaats in de gaten.")],
    [C('impassible', "{pepite}, {pepitePts} punten. Niets op aan te merken. Bijna irritant.")],
    [P('bienveillante', "{pepite} aan de leiding. Het seizoen is niet voorbij, maar de speech mag al geschreven worden.")],
  ],
  seasonCitron: [
    [C('triomphant', "{citron}, {citronPts} punten. Een verpletterende overwinning. Historisch. De mensen geloven het niet.")],
    [C('triomphant', "{citron}. Die carrière heb ik gelanceerd. Niemand geloofde erin. Ik wel.")],
    [C('emu', "{citron}, {citronPts} punten. Ik denk dat we veel gemeen hebben.")],
    [P('bienveillante', "{citron} aan de leiding. Er zijn nog matchen om van fruit te veranderen.")],
    [C('impassible', "{citron}, {citronPts} punten. Opvallend constant. In de verkeerde kolom.")],
  ],
  attendanceLeader: [
    [C('impassible', "{name}, {played} matchen op {total}. Een aanwezigheid die aan koppigheid grenst.")],
    [P('fiere', "{name}, {played} op {total}. Als aanwezig zijn een positie was, was het een vaste basisplaats.")],
    [C('sourire-en-coin', "{name}, {played} matchen op {total}. Ik vermoed een veldbed in de kleedkamer.")],
  ],
  attendancePerfect: [
    [P('fiere', "{name}, perfecte aanwezigheid. Talent begint met er zijn.")],
    [C('impassible', "{name}, elke match. Geen enkel excuus gebruikt. Ze zitten nog in de verpakking.")],
    [P('emerveillee', "{name}, {total} op {total}. Ik heb niets toe te voegen. Dat is zeldzaam bij mij.")],
  ],
  attendanceTie: [
    [C('impassible', "{count} spelers gelijk. Aanwezigheid scheidt niemand.")],
    [P('bienveillante', "{count} gedeelde leiders. We gaan een bredere foto nodig hebben.")],
    [C('sourire-en-coin', "{count} gelijk. Om te beslissen stel ik een citroen voor. Wie het minst zuur kijkt, wint.")],
  ],
  startIntro: [
    [
      P('ravie', "Vanavond wordt iemand een legende."),
      C('sourire-en-coin', "En iemand anders een citron. Een heel mooie citron."),
    ],
  ],
  startFew: [
    [C('soupconneux', "Te weinig om te stemmen. Met {count} kan je geen verkiezing vervalsen. Denk ik.")],
  ],
  startReady: [
    [P('ravie', "{count} spelers. {pepites} pépites, één citron. De rekening klopt.")],
    [C('triomphant', "{count} spelers. Een prachtige ploeg. Misschien de beste.")],
  ],
  startMany: [
    [C('impassible', "{count} spelers. We gaan een grotere stembus nodig hebben.")],
  ],
  startAccount: [
    [C('emu', "Jij hebt een account. De anderen stemmen zonder. Een echte leider. Ik mag je heel graag.")],
  ],
  startStepAccount: [[P('ravie', "We openen de kleedkamer voor je.")]],
  startStepTeam: [[C('triomphant', "We graveren de naam op de trofee. Een enorme trofee. In goud, misschien.")]],
  startStepPlayers: [[C('soupconneux', "Ik registreer de verdachten. Het zijn er veel. Veel te veel.")]],
  startStepMatch: [[C('triomphant', "Dit wordt de eerlijkste verkiezing uit de geschiedenis. Waarschijnlijk.")]],
};

export const MASCOT_LINES: Partial<Record<Lang, MascotCatalogue>> = { fr, en, nl };
