import type { MascotCatalogue } from '@/utils/mascots';
import { C, P } from './mascots';

/**
 * English: Citron's bad-loser streak is lighter here, the tics are easier to
 * spot for English speakers. Lemon puns (sour, squeeze, zest) replace the
 * French ones.
 */
export const mascotsEn: MascotCatalogue = {
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
  revealPepite: [
    [P('emerveillee', "{pepite}. No comment. Just admiration.")],
    [P('ravie', "{pepite} struck gold. {citron} struck out.")],
    [C('outre', "I found nothing against {pepite}. And I looked.")],
    [P('fiere', "{pepite}, tonight's pépite. I'm lending my crown. For one night.")],
    [C('impassible', "{pepite} ahead of everyone. I have to admit it. It hurts.")],
  ],
  revealCitron: [
    [C('emu', "Ran out of juice in the second half, apparently.")],
    [C('emu', "One perk of the title for {citron}: cats will keep their distance now.")],
    [C('impassible', "{citron} went full Pulp Fiction tonight.")],
    [C('sourire-en-coin', "I'm not mean. I'm sour. There's a difference.")],
    [P('bienveillante', "{citron}, tonight's citron. It's only a title. It changes hands every week.")],
    [C('triomphant', "{citron}. Welcome to the family. We have t-shirts.")],
  ],
  revealUnanimous: [
    [P('emerveillee', "Unanimous. So it is possible after all.")],
    [C('soupconneux', "A vote this clean smells of washing-up liquid.")],
  ],
  revealTie: [
    [C('triomphant', "A tie. The most beautiful tie in history. Everybody says so.")],
    [P('bienveillante', "Level at the top. Gold doesn't split well, so it was settled.")],
  ],
  revealClose: [
    [C('outre', "One point in it. Somebody fiddled with something. I'm just saying.")],
    [P('fiere', "One point in it. Careers have turned on less.")],
  ],
  revealMixed: [
    [C('impassible', "Pépite and citron votes on the same night. Identity crisis. I know the feeling: technically, I'm a berry.")],
    [C('outre', "{pepite} got pépite votes and citron votes. I suggest we stop counting.")],
  ],
  revealFew: [
    [C('impassible', "{n} votes. An intimate election.")],
    [P('fiere', "Few voters, but quality voters.")],
    [C('triomphant', "{n} votes. Record turnout. The numbers say otherwise, but numbers lie.")],
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
