import type { MascotCatalogue } from '@/utils/mascots';
import { C, P } from './mascots';

/**
 * Dutch (Belgium): je-vorm, « ploeg », « match », « kleedkamer », « toog ».
 * Lemon puns play on « zuur » and « citroen ».
 */
export const mascotsNl: MascotCatalogue = {
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
  revealPepite: [
    [P('emerveillee', "{pepite}. Geen commentaar, gewoon bewondering.")],
    [P('ravie', "{pepite} is een goudmijn. {citron} kijkt zuur.")],
    [C('outre', "Ik heb niets gevonden tegen {pepite}. Nochtans heb ik gezocht.")],
    [P('fiere', "{pepite}, pépite van de avond. Ik leen mijn kroon uit. Voor één nacht.")],
    [C('impassible', "{pepite} voor iedereen. Ik moet het toegeven. Het doet pijn.")],
  ],
  revealCitron: [
    [C('emu', "Geen sap meer in de tweede helft, blijkbaar.")],
    [C('emu', "Voordeel van de titel voor {citron}: geen enkele kat komt nog in de buurt.")],
    [C('impassible', "{citron} speelde vanavond in Pulp Fiction, blijkbaar.")],
    [C('sourire-en-coin', "Ik ben niet gemeen. Ik ben zuur, dat is iets anders.")],
    [P('bienveillante', "{citron}, citron van de avond. Het is maar een titel. Hij wisselt elke week van eigenaar.")],
    [C('triomphant', "{citron}. Welkom in de familie. We hebben T-shirts.")],
  ],
  revealUnanimous: [
    [P('emerveillee', "Unaniem. Zelfs in dit land kan het dus.")],
    [C('soupconneux', "Zo'n propere stemming ruikt naar afwasmiddel.")],
  ],
  revealTie: [
    [C('triomphant', "Gelijkspel. Het mooiste gelijkspel uit de geschiedenis. Iedereen zegt het.")],
    [P('bienveillante', "Gelijk aan de top. Goud deel je niet graag, dus werd er beslist.")],
  ],
  revealClose: [
    [C('outre', "Eén punt verschil. Er is gefraudeerd. Veel mensen zeggen het. Heel goede mensen.")],
    [P('fiere', "Eén punt verschil. Carrières zijn om minder beslist.")],
  ],
  revealMixed: [
    [C('impassible', "Pépite en citron op dezelfde avond. Een identiteitscrisis, dat ken ik: technisch gezien ben ik een bes.")],
    [C('outre', "{pepite} kreeg pépitestemmen en citronstemmen. Ik stel voor dat we stoppen met tellen.")],
  ],
  revealFew: [
    [C('impassible', "{n} stemmen. Een intieme verkiezing.")],
    [P('fiere', "Weinig stemmers, maar kwaliteitsstemmers.")],
    [C('triomphant', "{n} stemmen. Een recordopkomst. De cijfers zeggen iets anders, maar cijfers liegen.")],
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
