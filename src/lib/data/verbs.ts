import type { Verb } from "../types";

// Helper to keep entries compact
const v = (
  infinitive: string,
  pastSimple: string,
  pastParticiple: string,
  translation: string,
  groupId: string,
  examples: Verb["examples"],
  shadowing: Verb["shadowing"],
  opts: Partial<Verb> = {},
): Verb => ({
  id: infinitive,
  infinitive,
  pastSimple,
  pastParticiple,
  translation,
  groupId,
  examples,
  shadowing,
  frequency: opts.frequency ?? "medium",
  alternativePastParticiple: opts.alternativePastParticiple,
  alternativePastSimple: opts.alternativePastSimple,
  pattern: opts.pattern,
  hint: opts.hint,
});

export const VERBS: Verb[] = [
  // --- High frequency irregulars (mixed groups) ---
  v(
    "be",
    "was",
    "been",
    "быть",
    "abc",
    {
      pastSimple: "I was at home yesterday.",
      presentPerfect: "I have been to London twice.",
      passive: "The decision was made quickly.",
    },
    {
      formsText: "be — was, were — been",
      sentenceTexts: ["I was tired.", "They were happy.", "I have been busy."],
      recommendedSpeed: "normal",
    },
    {
      frequency: "high",
      alternativePastSimple: ["were"],
      hint: "Has two Past Simple forms: was (I/he/she/it) and were (you/we/they).",
    },
  ),
  v(
    "have",
    "had",
    "had",
    "иметь",
    "abb",
    {
      pastSimple: "I had a great time yesterday.",
      presentPerfect: "I have had this car for years.",
    },
    {
      formsText: "have — had — had",
      sentenceTexts: ["I had breakfast.", "She had a meeting.", "We have had enough."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "do",
    "did",
    "done",
    "делать",
    "abc",
    {
      pastSimple: "I did my homework.",
      presentPerfect: "I have done everything.",
      passive: "It was done correctly.",
    },
    {
      formsText: "do — did — done",
      sentenceTexts: ["I did it.", "Have you done it?", "It was done well."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "go",
    "went",
    "gone",
    "идти",
    "abc",
    {
      pastSimple: "She went to the store.",
      presentPerfect: "He has gone home.",
    },
    {
      formsText: "go — went — gone",
      sentenceTexts: ["I went there.", "She has gone.", "We went together."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "get",
    "got",
    "got",
    "получать, становиться",
    "abb",
    {
      pastSimple: "I got your message.",
      presentPerfect: "I have got a new phone.",
    },
    {
      formsText: "get — got — got, gotten",
      sentenceTexts: ["I got it.", "She has gotten better.", "We got home late."],
      recommendedSpeed: "normal",
    },
    {
      frequency: "high",
      alternativePastParticiple: ["gotten"],
      hint: "В американском варианте часто используется gotten.",
    },
  ),
  v(
    "make",
    "made",
    "made",
    "делать, создавать",
    "abb",
    {
      pastSimple: "She made a cake.",
      presentPerfect: "I have made a decision.",
      passive: "It was made in Italy.",
    },
    {
      formsText: "make — made — made",
      sentenceTexts: ["I made it.", "She made dinner.", "It was made by hand."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "take",
    "took",
    "taken",
    "брать",
    "ake-ook-aken",
    {
      pastSimple: "He took my book.",
      presentPerfect: "She has taken the test.",
      passive: "The photo was taken yesterday.",
    },
    {
      formsText: "take — took — taken",
      sentenceTexts: ["I took it.", "He has taken the bus.", "The decision was taken."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "come",
    "came",
    "come",
    "приходить",
    "aba",
    {
      pastSimple: "He came home late.",
      presentPerfect: "She has come back.",
    },
    {
      formsText: "come — came — come",
      sentenceTexts: ["I came early.", "He has come back.", "They came together."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "see",
    "saw",
    "seen",
    "видеть",
    "abc",
    {
      pastSimple: "I saw him at the party.",
      presentPerfect: "I have seen this film before.",
      passive: "He was seen near the school.",
    },
    {
      formsText: "see — saw — seen",
      sentenceTexts: ["I saw it.", "Have you seen her?", "It was seen by everyone."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "know",
    "knew",
    "known",
    "знать",
    "ow-ew-own",
    {
      pastSimple: "I knew the answer.",
      presentPerfect: "I have known him for years.",
    },
    {
      formsText: "know — knew — known",
      sentenceTexts: ["I knew it.", "I have known her since childhood.", "He knew the way."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "think",
    "thought",
    "thought",
    "думать",
    "ought-aught",
    {
      pastSimple: "I thought about it yesterday.",
      presentPerfect: "I have thought about your offer.",
    },
    {
      formsText: "think — thought — thought",
      sentenceTexts: ["I thought so.", "She thought about it.", "We have thought it through."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "say",
    "said",
    "said",
    "сказать",
    "abb",
    {
      pastSimple: "He said hello.",
      presentPerfect: "She has said enough.",
    },
    {
      formsText: "say — said — said",
      sentenceTexts: ["I said yes.", "He said nothing.", "She has said it before."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "tell",
    "told",
    "told",
    "рассказывать",
    "abb",
    {
      pastSimple: "She told me a secret.",
      presentPerfect: "I have told you many times.",
    },
    {
      formsText: "tell — told — told",
      sentenceTexts: ["I told you.", "He told the truth.", "We have told them already."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "give",
    "gave",
    "given",
    "давать",
    "abc",
    {
      pastSimple: "He gave me a gift.",
      presentPerfect: "She has given her answer.",
      passive: "A speech was given by the director.",
    },
    {
      formsText: "give — gave — given",
      sentenceTexts: ["I gave it.", "She has given up.", "A gift was given to me."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "find",
    "found",
    "found",
    "находить",
    "abb",
    {
      pastSimple: "I found my keys.",
      presentPerfect: "She has found a job.",
    },
    {
      formsText: "find — found — found",
      sentenceTexts: ["I found it.", "We found the answer.", "She has found a way."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "feel",
    "felt",
    "felt",
    "чувствовать",
    "ee-e-e",
    {
      pastSimple: "I felt tired yesterday.",
      presentPerfect: "She has felt better lately.",
    },
    {
      formsText: "feel — felt — felt",
      sentenceTexts: ["I felt great.", "He felt sad.", "We have felt this before."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "leave",
    "left",
    "left",
    "уходить, оставлять",
    "abb",
    {
      pastSimple: "He left the office early.",
      presentPerfect: "She has left the room.",
    },
    {
      formsText: "leave — left — left",
      sentenceTexts: ["I left it there.", "She left at 5.", "We have left a message."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "put",
    "put",
    "put",
    "класть",
    "aaa",
    {
      pastSimple: "I put the book on the table.",
      presentPerfect: "She has put the key in the lock.",
    },
    {
      formsText: "put — put — put",
      sentenceTexts: ["I put it down.", "She put it back.", "I have put it away."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "bring",
    "brought",
    "brought",
    "приносить",
    "ought-aught",
    {
      pastSimple: "She brought a cake.",
      presentPerfect: "I have brought my notebook.",
    },
    {
      formsText: "bring — brought — brought",
      sentenceTexts: ["I brought it.", "He brought coffee.", "We have brought the documents."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "become",
    "became",
    "become",
    "становиться",
    "aba",
    {
      pastSimple: "He became a doctor.",
      presentPerfect: "She has become famous.",
    },
    {
      formsText: "become — became — become",
      sentenceTexts: ["She became a teacher.", "He has become stronger.", "It became clear."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "write",
    "wrote",
    "written",
    "писать",
    "abc",
    {
      pastSimple: "I wrote a message yesterday.",
      presentPerfect: "I have written three emails today.",
      passive: "The book was written in 1998.",
    },
    {
      formsText: "write — wrote — written",
      sentenceTexts: [
        "I wrote a message yesterday.",
        "I have written three emails today.",
        "The book was written in 1998.",
      ],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "speak",
    "spoke",
    "spoken",
    "говорить",
    "abc",
    {
      pastSimple: "She spoke to me yesterday.",
      presentPerfect: "I have spoken to the manager.",
      passive: "English is spoken here.",
    },
    {
      formsText: "speak — spoke — spoken",
      sentenceTexts: ["I spoke up.", "She has spoken about it.", "English is spoken here."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "eat",
    "ate",
    "eaten",
    "есть",
    "abc",
    {
      pastSimple: "I ate breakfast at 8.",
      presentPerfect: "She has eaten already.",
    },
    {
      formsText: "eat — ate — eaten",
      sentenceTexts: ["I ate lunch.", "He has eaten it all.", "The cake was eaten."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "break",
    "broke",
    "broken",
    "ломать",
    "abc",
    {
      pastSimple: "He broke the window.",
      presentPerfect: "She has broken her arm.",
      passive: "The vase was broken.",
    },
    {
      formsText: "break — broke — broken",
      sentenceTexts: ["I broke it.", "She has broken her promise.", "It was broken."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "choose",
    "chose",
    "chosen",
    "выбирать",
    "abc",
    {
      pastSimple: "I chose the red one.",
      presentPerfect: "He has chosen a career.",
      passive: "She was chosen as captain.",
    },
    {
      formsText: "choose — chose — chosen",
      sentenceTexts: ["I chose this.", "He has chosen well.", "She was chosen by the team."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "begin",
    "began",
    "begun",
    "начинать",
    "iau",
    {
      pastSimple: "The film began at 7.",
      presentPerfect: "It has just begun.",
    },
    {
      formsText: "begin — began — begun",
      sentenceTexts: ["I began the project.", "It has begun.", "We began on time."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "drink",
    "drank",
    "drunk",
    "пить",
    "iau",
    {
      pastSimple: "He drank a glass of water.",
      presentPerfect: "She has drunk too much coffee.",
    },
    {
      formsText: "drink — drank — drunk",
      sentenceTexts: ["I drank tea.", "He has drunk all the juice.", "We drank together."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "ring",
    "rang",
    "rung",
    "звонить",
    "iau",
    {
      pastSimple: "The phone rang twice.",
      presentPerfect: "She has rung the bell.",
    },
    {
      formsText: "ring — rang — rung",
      sentenceTexts: ["I rang you.", "The bell rang.", "She has rung the doorbell."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "sing",
    "sang",
    "sung",
    "петь",
    "iau",
    {
      pastSimple: "She sang a beautiful song.",
      presentPerfect: "He has sung in many concerts.",
    },
    {
      formsText: "sing — sang — sung",
      sentenceTexts: ["I sang along.", "She sang loudly.", "The song was sung well."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "swim",
    "swam",
    "swum",
    "плавать",
    "iau",
    {
      pastSimple: "I swam in the lake.",
      presentPerfect: "She has swum across the river.",
    },
    {
      formsText: "swim — swam — swum",
      sentenceTexts: ["I swam yesterday.", "He has swum 10 laps.", "We swam at sunrise."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "drive",
    "drove",
    "driven",
    "водить",
    "abc",
    {
      pastSimple: "She drove home late.",
      presentPerfect: "He has driven this car for years.",
    },
    {
      formsText: "drive — drove — driven",
      sentenceTexts: ["I drove there.", "He has driven all night.", "The car was driven away."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "ride",
    "rode",
    "ridden",
    "ездить верхом",
    "abc",
    {
      pastSimple: "He rode a horse.",
      presentPerfect: "I have ridden a bike since I was five.",
    },
    {
      formsText: "ride — rode — ridden",
      sentenceTexts: ["I rode a bike.", "She has ridden a horse.", "We rode together."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "rise",
    "rose",
    "risen",
    "подниматься",
    "abc",
    {
      pastSimple: "The sun rose at 6.",
      presentPerfect: "Prices have risen this year.",
    },
    {
      formsText: "rise — rose — risen",
      sentenceTexts: ["The sun rose.", "Prices have risen.", "She rose to her feet."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "fall",
    "fell",
    "fallen",
    "падать",
    "abc",
    {
      pastSimple: "He fell off the bike.",
      presentPerfect: "She has fallen asleep.",
    },
    {
      formsText: "fall — fell — fallen",
      sentenceTexts: ["I fell down.", "He has fallen behind.", "The leaves fell."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "grow",
    "grew",
    "grown",
    "расти",
    "ow-ew-own",
    {
      pastSimple: "He grew up in Moscow.",
      presentPerfect: "She has grown a lot.",
    },
    {
      formsText: "grow — grew — grown",
      sentenceTexts: ["I grew taller.", "He has grown up.", "Flowers grew here."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "throw",
    "threw",
    "thrown",
    "бросать",
    "ow-ew-own",
    {
      pastSimple: "He threw the ball.",
      presentPerfect: "She has thrown it away.",
      passive: "The party was thrown by my friends.",
    },
    {
      formsText: "throw — threw — thrown",
      sentenceTexts: ["I threw it.", "She has thrown it away.", "The ball was thrown."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "blow",
    "blew",
    "blown",
    "дуть",
    "ow-ew-own",
    {
      pastSimple: "The wind blew strongly.",
      presentPerfect: "The storm has blown away.",
    },
    {
      formsText: "blow — blew — blown",
      sentenceTexts: ["The wind blew.", "She blew out the candles.", "It has blown over."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "fly",
    "flew",
    "flown",
    "летать",
    "ow-ew-own",
    {
      pastSimple: "We flew to Paris.",
      presentPerfect: "She has flown many times.",
    },
    {
      formsText: "fly — flew — flown",
      sentenceTexts: ["I flew home.", "The bird flew away.", "He has flown to London."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "send",
    "sent",
    "sent",
    "отправлять",
    "abb",
    {
      pastSimple: "I sent the letter.",
      presentPerfect: "She has sent the email.",
      passive: "The package was sent yesterday.",
    },
    {
      formsText: "send — sent — sent",
      sentenceTexts: ["I sent it.", "She has sent a reply.", "The letter was sent."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "spend",
    "spent",
    "spent",
    "тратить, проводить время",
    "abb",
    {
      pastSimple: "We spent a week in Rome.",
      presentPerfect: "I have spent all my money.",
    },
    {
      formsText: "spend — spent — spent",
      sentenceTexts: ["I spent time with family.", "He spent it all.", "We have spent enough."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "lend",
    "lent",
    "lent",
    "одалживать",
    "abb",
    {
      pastSimple: "He lent me his car.",
      presentPerfect: "She has lent him money.",
    },
    {
      formsText: "lend — lent — lent",
      sentenceTexts: ["I lent her a book.", "He lent me 10 dollars.", "She has lent him a hand."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "bend",
    "bent",
    "bent",
    "сгибать",
    "abb",
    {
      pastSimple: "She bent down to pick it up.",
      presentPerfect: "He has bent the wire.",
    },
    {
      formsText: "bend — bent — bent",
      sentenceTexts: ["I bent down.", "He bent the metal.", "It was bent out of shape."],
      recommendedSpeed: "normal",
    },
    { frequency: "low" },
  ),
  v(
    "build",
    "built",
    "built",
    "строить",
    "abb",
    {
      pastSimple: "They built a new school.",
      presentPerfect: "We have built a house.",
      passive: "The bridge was built in 1990.",
    },
    {
      formsText: "build — built — built",
      sentenceTexts: ["I built it myself.", "They have built a new road.", "The house was built quickly."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "lose",
    "lost",
    "lost",
    "терять",
    "abb",
    {
      pastSimple: "I lost my keys.",
      presentPerfect: "He has lost weight.",
    },
    {
      formsText: "lose — lost — lost",
      sentenceTexts: ["I lost it.", "He has lost his job.", "We lost the game."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "win",
    "won",
    "won",
    "выигрывать",
    "abb",
    {
      pastSimple: "She won the race.",
      presentPerfect: "We have won the cup.",
      passive: "The prize was won by a student.",
    },
    {
      formsText: "win — won — won",
      sentenceTexts: ["I won!", "She has won again.", "The match was won easily."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "sit",
    "sat",
    "sat",
    "сидеть",
    "abb",
    {
      pastSimple: "He sat down quietly.",
      presentPerfect: "I have sat here for an hour.",
    },
    {
      formsText: "sit — sat — sat",
      sentenceTexts: ["I sat down.", "She has sat there all day.", "We sat by the window."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "stand",
    "stood",
    "stood",
    "стоять",
    "abb",
    {
      pastSimple: "She stood by the door.",
      presentPerfect: "He has stood up for me.",
    },
    {
      formsText: "stand — stood — stood",
      sentenceTexts: ["I stood up.", "He stood still.", "She has stood there for hours."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "understand",
    "understood",
    "understood",
    "понимать",
    "abb",
    {
      pastSimple: "I understood the lesson.",
      presentPerfect: "She has understood the rules.",
    },
    {
      formsText: "understand — understood — understood",
      sentenceTexts: ["I understood you.", "He understood everything.", "We have understood the task."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "cut",
    "cut",
    "cut",
    "резать",
    "aaa",
    {
      pastSimple: "He cut his finger yesterday.",
      presentPerfect: "She has cut her hair.",
    },
    {
      formsText: "cut — cut — cut",
      sentenceTexts: ["I cut the bread.", "She cut her finger.", "He has cut the grass."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "hit",
    "hit",
    "hit",
    "ударять",
    "aaa",
    {
      pastSimple: "The car hit a tree.",
      presentPerfect: "He has hit a home run.",
    },
    {
      formsText: "hit — hit — hit",
      sentenceTexts: ["I hit the ball.", "She hit the target.", "The car has hit a wall."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "let",
    "let",
    "let",
    "позволять",
    "aaa",
    {
      pastSimple: "He let me drive his car.",
      presentPerfect: "She has let the dog out.",
    },
    {
      formsText: "let — let — let",
      sentenceTexts: ["I let him go.", "She let me try.", "He has let us in."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "cost",
    "cost",
    "cost",
    "стоить",
    "aaa",
    {
      pastSimple: "The ticket cost 50 dollars.",
      presentPerfect: "It has cost us a lot.",
    },
    {
      formsText: "cost — cost — cost",
      sentenceTexts: ["It cost a lot.", "The repair cost 100 dollars.", "It has cost too much."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "shut",
    "shut",
    "shut",
    "закрывать",
    "aaa",
    {
      pastSimple: "She shut the door quietly.",
      presentPerfect: "He has shut the windows.",
    },
    {
      formsText: "shut — shut — shut",
      sentenceTexts: ["I shut the door.", "She shut her eyes.", "He has shut the shop."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "meet",
    "met",
    "met",
    "встречать",
    "ee-e-e",
    {
      pastSimple: "I met her at school.",
      presentPerfect: "We have met before.",
    },
    {
      formsText: "meet — met — met",
      sentenceTexts: ["I met him.", "We met at the cafe.", "She has met them already."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "feed",
    "fed",
    "fed",
    "кормить",
    "ee-e-e",
    {
      pastSimple: "I fed the cat this morning.",
      presentPerfect: "She has fed the baby.",
    },
    {
      formsText: "feed — fed — fed",
      sentenceTexts: ["I fed the dog.", "She fed the birds.", "We have fed everyone."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "keep",
    "kept",
    "kept",
    "хранить, держать",
    "ee-e-e",
    {
      pastSimple: "He kept the secret.",
      presentPerfect: "She has kept her promise.",
    },
    {
      formsText: "keep — kept — kept",
      sentenceTexts: ["I kept it.", "She kept calm.", "He has kept in touch."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "sleep",
    "slept",
    "slept",
    "спать",
    "ee-e-e",
    {
      pastSimple: "I slept well last night.",
      presentPerfect: "She has slept all day.",
    },
    {
      formsText: "sleep — slept — slept",
      sentenceTexts: ["I slept late.", "He slept on the sofa.", "We have slept enough."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "fight",
    "fought",
    "fought",
    "бороться",
    "ought-aught",
    {
      pastSimple: "They fought bravely.",
      presentPerfect: "He has fought many battles.",
    },
    {
      formsText: "fight — fought — fought",
      sentenceTexts: ["I fought hard.", "They fought back.", "We have fought for it."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "teach",
    "taught",
    "taught",
    "учить (кого-то)",
    "ought-aught",
    {
      pastSimple: "She taught me English.",
      presentPerfect: "He has taught for ten years.",
      passive: "French is taught at this school.",
    },
    {
      formsText: "teach — taught — taught",
      sentenceTexts: ["I taught him.", "She taught math.", "He has taught us a lot."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "catch",
    "caught",
    "caught",
    "ловить",
    "ought-aught",
    {
      pastSimple: "He caught the ball.",
      presentPerfect: "She has caught a cold.",
    },
    {
      formsText: "catch — caught — caught",
      sentenceTexts: ["I caught it.", "She caught the train.", "He has caught a cold."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "buy",
    "bought",
    "bought",
    "покупать",
    "ought-aught",
    {
      pastSimple: "I bought a new phone yesterday.",
      presentPerfect: "She has bought a car.",
      passive: "The book was bought online.",
    },
    {
      formsText: "buy — bought — bought",
      sentenceTexts: ["I bought it.", "She bought flowers.", "We have bought tickets."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
  v(
    "mistake",
    "mistook",
    "mistaken",
    "ошибаться",
    "ake-ook-aken",
    {
      pastSimple: "I mistook her for her sister.",
      presentPerfect: "He has mistaken the address.",
    },
    {
      formsText: "mistake — mistook — mistaken",
      sentenceTexts: ["I mistook him.", "She mistook the date.", "He has mistaken the meaning."],
      recommendedSpeed: "normal",
    },
    { frequency: "low" },
  ),
  v(
    "shake",
    "shook",
    "shaken",
    "трясти",
    "ake-ook-aken",
    {
      pastSimple: "He shook my hand.",
      presentPerfect: "The news has shaken her.",
    },
    {
      formsText: "shake — shook — shaken",
      sentenceTexts: ["I shook his hand.", "She shook her head.", "He was shaken by the news."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "wake",
    "woke",
    "woken",
    "просыпаться",
    "ake-ook-aken",
    {
      pastSimple: "I woke up at 7.",
      presentPerfect: "She has woken the baby.",
    },
    {
      formsText: "wake — woke — woken",
      sentenceTexts: ["I woke up.", "She woke early.", "He has woken everyone."],
      recommendedSpeed: "normal",
    },
    { frequency: "medium" },
  ),
  v(
    "run",
    "ran",
    "run",
    "бегать",
    "aba",
    {
      pastSimple: "He ran a marathon.",
      presentPerfect: "She has run out of time.",
    },
    {
      formsText: "run — ran — run",
      sentenceTexts: ["I ran fast.", "He ran home.", "She has run a marathon."],
      recommendedSpeed: "normal",
    },
    { frequency: "high" },
  ),
];

// Compact helper for the expanded dataset.
const n = (
  id: string,
  ps: string,
  pp: string,
  tr: string,
  gid: string,
  exPS: string,
  exPP: string,
  formsText: string,
  s1: string,
  s2: string,
  opts: Partial<Verb> & { exPassive?: string; s3?: string } = {},
): Verb => ({
  id,
  infinitive: id,
  pastSimple: ps,
  pastParticiple: pp,
  translation: tr,
  groupId: gid,
  frequency: opts.frequency ?? "medium",
  alternativePastSimple: opts.alternativePastSimple,
  alternativePastParticiple: opts.alternativePastParticiple,
  pattern: opts.pattern,
  hint: opts.hint,
  examples: { pastSimple: exPS, presentPerfect: exPP, passive: opts.exPassive },
  shadowing: {
    formsText,
    sentenceTexts: opts.s3 ? [s1, s2, opts.s3] : [s1, s2],
    recommendedSpeed: "normal",
  },
});

const EXTRA_VERBS: Verb[] = [
  // A-A-A (no change across forms)
  n("burst", "burst", "burst", "лопаться, взрываться", "aaa", "The pipe burst last night.", "The balloon has burst.", "burst — burst — burst", "The pipe burst.", "The balloon has burst.", { exPassive: "The door was burst open." }),
  n("cast", "cast", "cast", "бросать, назначать (роль)", "aaa", "He cast a stone into the river.", "She has been cast in the film.", "cast — cast — cast", "He cast a stone.", "She has been cast in the film.", { exPassive: "She was cast as the lead." }),
  n("hurt", "hurt", "hurt", "ранить, болеть", "aaa", "My leg hurt yesterday.", "I have hurt my hand.", "hurt — hurt — hurt", "My leg hurt.", "I have hurt my hand.", { frequency: "high", exPassive: "He was hurt in the accident." }),
  n("quit", "quit", "quit", "бросать (занятие), увольняться", "aaa", "She quit her job last month.", "He has quit smoking.", "quit — quit — quit", "She quit her job.", "He has quit smoking.", { frequency: "high" }),
  n("read", "read", "read", "читать", "aaa", "I read the book yesterday.", "I have read it twice.", "read — read — read", "I read the book.", "I have read it twice.", { frequency: "high", hint: "Произношение меняется: read [riːd] — read [red] — read [red]." }),
  n("set", "set", "set", "ставить, устанавливать", "aaa", "She set the table.", "He has set a new record.", "set — set — set", "She set the table.", "He has set a new record.", { frequency: "high", exPassive: "The date was set." }),
  n("split", "split", "split", "разделять, раскалывать", "aaa", "They split the bill.", "The group has split into two.", "split — split — split", "They split the bill.", "The group has split.", { exPassive: "The wood was split in two." }),
  n("spread", "spread", "spread", "распространять, намазывать", "aaa", "The fire spread quickly.", "The news has spread fast.", "spread — spread — spread", "The fire spread fast.", "The news has spread.", { exPassive: "Butter was spread on the bread." }),
  n("bet", "bet", "bet", "спорить, ставить", "aaa", "I bet ten dollars.", "I have bet on the wrong horse.", "bet — bet — bet", "I bet ten dollars.", "I have bet on the wrong horse."),
  n("broadcast", "broadcast", "broadcast", "транслировать", "aaa", "The BBC broadcast the match live.", "They have broadcast the news.", "broadcast — broadcast — broadcast", "They broadcast the match live.", "It has been broadcast already.", { exPassive: "The match was broadcast live." }),
  n("forecast", "forecast", "forecast", "прогнозировать", "aaa", "They forecast rain for Monday.", "Experts have forecast a recession.", "forecast — forecast — forecast", "They forecast rain.", "Experts have forecast a slowdown.", { exPassive: "Rain was forecast for today." }),
  n("bid", "bid", "bid", "предлагать цену", "aaa", "She bid a hundred dollars.", "He has bid for the painting.", "bid — bid — bid", "She bid a hundred dollars.", "He has bid for the painting."),
  n("shed", "shed", "shed", "проливать (слёзы), сбрасывать", "aaa", "The tree shed its leaves.", "She has shed a few tears.", "shed — shed — shed", "The tree shed its leaves.", "She has shed a few tears."),
  n("thrust", "thrust", "thrust", "толкать, втыкать", "aaa", "He thrust the letter into my hand.", "She has thrust the door open.", "thrust — thrust — thrust", "He thrust the letter at me.", "She has thrust the door open."),
  n("upset", "upset", "upset", "расстраивать", "aaa", "The news upset her.", "You have upset me.", "upset — upset — upset", "The news upset her.", "You have upset me.", { exPassive: "She was upset by the news." }),

  // A-B-B (same past simple and participle)
  n("deal", "dealt", "dealt", "иметь дело, раздавать", "abb", "She dealt with the problem quickly.", "I have dealt with this before.", "deal — dealt — dealt", "She dealt with it.", "I have dealt with this before.", { frequency: "high" }),
  n("dig", "dug", "dug", "копать", "abb", "He dug a deep hole.", "They have dug a tunnel.", "dig — dug — dug", "He dug a hole.", "They have dug a tunnel.", { exPassive: "A hole was dug in the garden." }),
  n("dream", "dreamed", "dreamed", "мечтать, видеть сны", "abb", "I dreamed about flying.", "She has dreamt of this moment.", "dream — dreamed, dreamt — dreamed, dreamt", "I dreamed about flying.", "She has dreamt of this moment.", { alternativePastSimple: ["dreamt"], alternativePastParticiple: ["dreamt"], hint: "Обе формы dreamed и dreamt верны. Dreamt чаще в британском английском." }),
  n("hang", "hung", "hung", "висеть, вешать", "abb", "She hung the picture on the wall.", "I have hung my coat up.", "hang — hung — hung", "She hung the picture up.", "I have hung my coat.", { exPassive: "The picture was hung on the wall.", hint: "В значении 'казнить через повешение' используется правильная форма hanged." }),
  n("hear", "heard", "heard", "слышать", "abb", "I heard a strange noise.", "I have heard this song before.", "hear — heard — heard", "I heard a noise.", "I have heard this before.", { frequency: "high", exPassive: "His voice was heard from afar." }),
  n("hold", "held", "held", "держать, проводить", "abb", "She held my hand.", "They have held three meetings.", "hold — held — held", "She held my hand.", "They have held a meeting.", { frequency: "high", exPassive: "The conference was held in May." }),
  n("lay", "laid", "laid", "класть, укладывать", "abb", "She laid the baby on the bed.", "He has laid the table.", "lay — laid — laid", "She laid the baby down.", "He has laid the table.", { hint: "Не путать с lie — lay — lain ('лежать')." }),
  n("leap", "leaped", "leaped", "прыгать", "abb", "The cat leaped onto the chair.", "He has leapt over the fence.", "leap — leaped, leapt — leaped, leapt", "The cat leaped onto the chair.", "He has leapt over the fence.", { alternativePastSimple: ["leapt"], alternativePastParticiple: ["leapt"] }),
  n("learn", "learned", "learned", "учить, узнавать", "abb", "I learned English at school.", "She has learnt a lot this year.", "learn — learned, learnt — learned, learnt", "I learned English at school.", "She has learnt a lot.", { frequency: "high", alternativePastSimple: ["learnt"], alternativePastParticiple: ["learnt"], hint: "Обе формы допустимы. Learnt чаще в британском, learned в американском." }),
  n("light", "lit", "lit", "освещать, зажигать", "abb", "He lit a candle.", "She has lit the fire.", "light — lit — lit", "He lit a candle.", "She has lit the fire.", { exPassive: "The room was lit by candles." }),
  n("mean", "meant", "meant", "значить, иметь в виду", "abb", "I meant no harm.", "What has she meant by that?", "mean — meant — meant", "I meant no harm.", "What have you meant?", { frequency: "high" }),
  n("pay", "paid", "paid", "платить", "abb", "I paid the bill.", "She has paid for everything.", "pay — paid — paid", "I paid the bill.", "She has paid for everything.", { frequency: "high", exPassive: "The bill was paid in cash." }),
  n("sell", "sold", "sold", "продавать", "abb", "He sold his car last week.", "They have sold the house.", "sell — sold — sold", "He sold his car.", "They have sold the house.", { frequency: "high", exPassive: "The tickets were sold out." }),
  n("shine", "shone", "shone", "светить, сиять", "abb", "The sun shone brightly.", "The moon has shone all night.", "shine — shone — shone", "The sun shone brightly.", "The moon has shone all night."),
  n("shoot", "shot", "shot", "стрелять", "abb", "He shot an arrow.", "She has shot a film here.", "shoot — shot — shot", "He shot an arrow.", "She has shot a great film.", { exPassive: "He was shot in the leg." }),
  n("slide", "slid", "slid", "скользить", "abb", "The book slid off the table.", "He has slid down the slope.", "slide — slid — slid", "The book slid off the table.", "He has slid down the slope."),
  n("smell", "smelled", "smelled", "пахнуть, нюхать", "abb", "I smelled smoke in the kitchen.", "She has smelt the flowers.", "smell — smelled, smelt — smelled, smelt", "I smelled smoke.", "She has smelt the flowers.", { alternativePastSimple: ["smelt"], alternativePastParticiple: ["smelt"] }),
  n("spell", "spelled", "spelled", "писать по буквам", "abb", "He spelled his name slowly.", "She has spelt it correctly.", "spell — spelled, spelt — spelled, spelt", "He spelled his name.", "She has spelt it correctly.", { alternativePastSimple: ["spelt"], alternativePastParticiple: ["spelt"] }),
  n("spill", "spilled", "spilled", "проливать", "abb", "I spilled my coffee.", "He has spilt the milk.", "spill — spilled, spilt — spilled, spilt", "I spilled my coffee.", "He has spilt the milk.", { alternativePastSimple: ["spilt"], alternativePastParticiple: ["spilt"] }),
  n("stick", "stuck", "stuck", "приклеивать, застревать", "abb", "The door stuck again.", "I have stuck the stamp on.", "stick — stuck — stuck", "The door stuck again.", "I have stuck the stamp on."),
  n("strike", "struck", "struck", "ударять, бастовать", "abb", "Lightning struck the tree.", "The workers have struck for higher pay.", "strike — struck — struck", "Lightning struck the tree.", "Workers have struck for pay.", { exPassive: "He was struck by lightning." }),
  n("swing", "swung", "swung", "качаться, размахивать", "abb", "The door swung open.", "She has swung the bat.", "swing — swung — swung", "The door swung open.", "She has swung the bat."),
  n("burn", "burned", "burned", "гореть, обжигать", "abb", "The candle burned all night.", "I have burnt the toast.", "burn — burned, burnt — burned, burnt", "The candle burned brightly.", "I have burnt the toast.", { frequency: "high", alternativePastSimple: ["burnt"], alternativePastParticiple: ["burnt"] }),
  n("spit", "spat", "spat", "плевать", "abb", "He spat on the ground.", "The cat has spat at me.", "spit — spat — spat", "He spat on the ground.", "The cat has spat at me.", { alternativePastSimple: ["spit"], alternativePastParticiple: ["spit"] }),
  n("wind", "wound", "wound", "наматывать, заводить", "abb", "He wound the rope around the tree.", "She has wound the clock.", "wind — wound — wound", "He wound the rope.", "She has wound the clock."),
  n("bind", "bound", "bound", "связывать", "abb", "They bound the books in leather.", "We have bound the contract.", "bind — bound — bound", "They bound the books.", "We have bound the contract.", { exPassive: "She was bound by the agreement." }),
  n("grind", "ground", "ground", "молоть, точить", "abb", "She ground the coffee beans.", "He has ground the knife sharp.", "grind — ground — ground", "She ground the coffee.", "He has ground the knife."),
  n("foretell", "foretold", "foretold", "предсказывать", "abb", "She foretold the future.", "He has foretold a storm.", "foretell — foretold — foretold", "She foretold the future.", "He has foretold a storm."),
  n("uphold", "upheld", "upheld", "поддерживать, защищать", "abb", "The court upheld the decision.", "We have upheld our promise.", "uphold — upheld — upheld", "The court upheld the decision.", "We have upheld our promise.", { exPassive: "The verdict was upheld." }),
  n("misunderstand", "misunderstood", "misunderstood", "неправильно понимать", "abb", "She misunderstood my question.", "I have misunderstood you.", "misunderstand — misunderstood — misunderstood", "She misunderstood me.", "I have misunderstood you."),
  n("rebuild", "rebuilt", "rebuilt", "перестраивать", "abb", "They rebuilt the bridge.", "We have rebuilt the house.", "rebuild — rebuilt — rebuilt", "They rebuilt the bridge.", "We have rebuilt the house.", { exPassive: "The city was rebuilt after the war." }),
  n("repay", "repaid", "repaid", "возвращать (долг)", "abb", "He repaid the loan in full.", "She has repaid me already.", "repay — repaid — repaid", "He repaid the loan.", "She has repaid me already."),
  n("overhear", "overheard", "overheard", "подслушивать", "abb", "I overheard their conversation.", "She has overheard everything.", "overhear — overheard — overheard", "I overheard them.", "She has overheard everything."),

  // A-B-C (three distinct forms)
  n("arise", "arose", "arisen", "возникать, появляться", "abc", "A problem arose during the meeting.", "Many questions have arisen.", "arise — arose — arisen", "A problem arose.", "Many questions have arisen."),
  n("awake", "awoke", "awoken", "просыпаться", "abc", "I awoke at six.", "She has awoken early.", "awake — awoke — awoken", "I awoke at six.", "She has awoken early."),
  n("bite", "bit", "bitten", "кусать", "abc", "The dog bit me.", "I have been bitten by a mosquito.", "bite — bit — bitten", "The dog bit me.", "I have been bitten.", { exPassive: "He was bitten by a dog." }),
  n("forbid", "forbade", "forbidden", "запрещать", "abc", "Her parents forbade the trip.", "Smoking has been forbidden here.", "forbid — forbade — forbidden", "They forbade the trip.", "Smoking has been forbidden.", { exPassive: "Smoking is forbidden here." }),
  n("forgive", "forgave", "forgiven", "прощать", "abc", "She forgave him quickly.", "I have forgiven you.", "forgive — forgave — forgiven", "She forgave him.", "I have forgiven you."),
  n("freeze", "froze", "frozen", "замораживать", "abc", "The lake froze in January.", "The food has frozen solid.", "freeze — froze — frozen", "The lake froze.", "The food has frozen.", { exPassive: "The pipes were frozen." }),
  n("hide", "hid", "hidden", "прятать", "abc", "He hid the keys.", "She has hidden the letter.", "hide — hid — hidden", "He hid the keys.", "She has hidden the letter.", { exPassive: "The treasure was hidden in the cave." }),
  n("steal", "stole", "stolen", "красть", "abc", "Someone stole my bike.", "My wallet has been stolen.", "steal — stole — stolen", "Someone stole my bike.", "My wallet has been stolen.", { exPassive: "The car was stolen last night." }),
  n("tear", "tore", "torn", "рвать", "abc", "She tore the letter in half.", "I have torn my jeans.", "tear — tore — torn", "She tore the letter.", "I have torn my jeans.", { exPassive: "The paper was torn." }),
  n("wear", "wore", "worn", "носить (одежду)", "abc", "She wore a red dress.", "I have worn this shirt before.", "wear — wore — worn", "She wore a red dress.", "I have worn this shirt before.", { frequency: "high" }),
  n("weave", "wove", "woven", "ткать, плести", "abc", "She wove a beautiful rug.", "They have woven a tapestry.", "weave — wove — woven", "She wove a rug.", "They have woven a tapestry.", { exPassive: "The basket was woven by hand." }),
  n("bear", "bore", "borne", "нести, выносить", "abc", "She bore the pain bravely.", "He has borne the responsibility.", "bear — bore — borne", "She bore the pain.", "He has borne the burden.", { hint: "Третья форма born используется только в значении 'рождённый': He was born in 1990." }),
  n("forget", "forgot", "forgotten", "забывать", "abc", "I forgot her name.", "He has forgotten the password.", "forget — forgot — forgotten", "I forgot her name.", "He has forgotten the password.", { frequency: "high" }),
  n("swear", "swore", "sworn", "клясться, ругаться", "abc", "He swore to tell the truth.", "She has sworn an oath.", "swear — swore — sworn", "He swore to tell the truth.", "She has sworn an oath."),
  n("foresee", "foresaw", "foreseen", "предвидеть", "abc", "Nobody foresaw the crisis.", "We have foreseen this outcome.", "foresee — foresaw — foreseen", "Nobody foresaw the crisis.", "We have foreseen this."),
  n("undergo", "underwent", "undergone", "проходить через, переносить", "abc", "She underwent surgery last week.", "The plan has undergone changes.", "undergo — underwent — undergone", "She underwent surgery.", "The plan has undergone changes."),
  n("rewrite", "rewrote", "rewritten", "переписывать", "abc", "He rewrote the essay.", "She has rewritten the chapter.", "rewrite — rewrote — rewritten", "He rewrote the essay.", "She has rewritten the chapter.", { exPassive: "The book was rewritten." }),

  // A-B-A
  n("overcome", "overcame", "overcome", "преодолевать", "aba", "She overcame her fear.", "We have overcome many problems.", "overcome — overcame — overcome", "She overcame her fear.", "We have overcome many problems."),

  // i-a-u
  n("shrink", "shrank", "shrunk", "уменьшаться, садиться", "iau", "My sweater shrank in the wash.", "The market has shrunk this year.", "shrink — shrank — shrunk", "My sweater shrank.", "The market has shrunk."),
  n("sink", "sank", "sunk", "тонуть, погружаться", "iau", "The ship sank quickly.", "The boat has sunk.", "sink — sank — sunk", "The ship sank.", "The boat has sunk.", { exPassive: "The ship was sunk by a storm." }),

  // ee → e → e
  n("bleed", "bled", "bled", "кровоточить", "ee-e-e", "His nose bled all morning.", "The cut has bled a lot.", "bleed — bled — bled", "His nose bled.", "The cut has bled a lot."),
  n("breed", "bred", "bred", "разводить, размножаться", "ee-e-e", "They bred horses for years.", "She has bred prize-winning dogs.", "breed — bred — bred", "They bred horses.", "She has bred dogs."),
  n("creep", "crept", "crept", "ползти, красться", "ee-e-e", "The cat crept along the wall.", "Doubt has crept into my mind.", "creep — crept — crept", "The cat crept silently.", "Doubt has crept in."),
  n("flee", "fled", "fled", "убегать, спасаться", "ee-e-e", "They fled the country.", "Many have fled the war.", "flee — fled — fled", "They fled the country.", "Many have fled the war."),
  n("lead", "led", "led", "вести, руководить", "ee-e-e", "She led the team to victory.", "He has led this project.", "lead — led — led", "She led the team.", "He has led the project.", { frequency: "high", exPassive: "The team was led by Anna." }),
  n("speed", "sped", "sped", "ехать быстро, ускорять", "ee-e-e", "The car sped down the road.", "Time has sped by.", "speed — sped — sped", "The car sped away.", "Time has sped by.", { alternativePastSimple: ["speeded"], alternativePastParticiple: ["speeded"] }),
  n("sweep", "swept", "swept", "подметать", "ee-e-e", "She swept the floor.", "He has swept the leaves up.", "sweep — swept — swept", "She swept the floor.", "He has swept the leaves."),
  n("weep", "wept", "wept", "плакать, рыдать", "ee-e-e", "She wept all night.", "He has wept for them.", "weep — wept — wept", "She wept all night.", "He has wept for them."),
  n("mislead", "misled", "misled", "вводить в заблуждение", "ee-e-e", "They misled the public.", "He has misled us.", "mislead — misled — misled", "They misled the public.", "He has misled us.", { exPassive: "We were misled by the report." }),

  // -ought / -aught
  n("seek", "sought", "sought", "искать, добиваться", "ought-aught", "She sought advice from a friend.", "We have sought help everywhere.", "seek — sought — sought", "She sought advice.", "We have sought help."),

  // -ow / -ew / -own
  n("draw", "drew", "drawn", "рисовать, тянуть", "ow-ew-own", "He drew a picture.", "She has drawn a map.", "draw — drew — drawn", "He drew a picture.", "She has drawn a map.", { frequency: "high", exPassive: "Lots were drawn at random." }),
  n("withdraw", "withdrew", "withdrawn", "снимать (деньги), отзывать", "ow-ew-own", "He withdrew some cash.", "She has withdrawn from the race.", "withdraw — withdrew — withdrawn", "He withdrew some cash.", "She has withdrawn from the race.", { exPassive: "The offer was withdrawn." }),

  // -ake / -ook / -aken
  n("forsake", "forsook", "forsaken", "покидать, оставлять", "ake-ook-aken", "He forsook his old friends.", "She has forsaken her hometown.", "forsake — forsook — forsaken", "He forsook his friends.", "She has forsaken her town."),
  n("undertake", "undertook", "undertaken", "браться за, предпринимать", "ake-ook-aken", "She undertook the project alone.", "We have undertaken a study.", "undertake — undertook — undertaken", "She undertook the project.", "We have undertaken a study."),

  // Mixed / fallback group
  n("prove", "proved", "proved", "доказывать", "mixed", "He proved his point.", "She has proven her skill.", "prove — proved — proved, proven", "He proved his point.", "She has proven her skill.", { alternativePastParticiple: ["proven"], hint: "Допустимы обе третьи формы: proved (BrE) и proven (AmE)." }),
  n("show", "showed", "shown", "показывать", "mixed", "She showed me the photos.", "He has shown great courage.", "show — showed — shown", "She showed me the photos.", "He has shown courage.", { frequency: "high", alternativePastParticiple: ["showed"], exPassive: "The film was shown last night." }),
  n("sew", "sewed", "sewn", "шить", "mixed", "She sewed a new dress.", "He has sewn the button on.", "sew — sewed — sewn", "She sewed a new dress.", "He has sewn the button on.", { alternativePastParticiple: ["sewed"] }),
  n("sow", "sowed", "sown", "сеять", "mixed", "We sowed the seeds in April.", "Farmers have sown the fields.", "sow — sowed — sown", "We sowed the seeds.", "Farmers have sown the fields.", { alternativePastParticiple: ["sowed"] }),
  n("beat", "beat", "beaten", "бить, побеждать", "mixed", "Our team beat them 3-1.", "She has beaten the record.", "beat — beat — beaten", "Our team beat them.", "She has beaten the record.", { frequency: "high", exPassive: "They were beaten in the final." }),
];

VERBS.push(...EXTRA_VERBS);

// ============ Data validation ============

export type VerbValidationIssue = {
  verbId: string;
  field: string;
  message: string;
};

const VALID_GROUP_IDS = new Set([
  "aaa",
  "abb",
  "abc",
  "aba",
  "iau",
  "ee-e-e",
  "ought-aught",
  "ow-ew-own",
  "ake-ook-aken",
  "mixed",
]);

export function validateVerbs(verbs: Verb[] = VERBS): VerbValidationIssue[] {
  const issues: VerbValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenInfinitives = new Set<string>();

  for (const verb of verbs) {
    const id = verb.id || "(no id)";

    if (!verb.id) issues.push({ verbId: id, field: "id", message: "Missing id" });
    if (seenIds.has(verb.id)) issues.push({ verbId: id, field: "id", message: "Duplicate id" });
    seenIds.add(verb.id);

    if (!verb.infinitive) issues.push({ verbId: id, field: "infinitive", message: "Missing infinitive" });
    if (!verb.pastSimple) issues.push({ verbId: id, field: "pastSimple", message: "Missing pastSimple" });
    if (!verb.pastParticiple) issues.push({ verbId: id, field: "pastParticiple", message: "Missing pastParticiple" });
    if (!verb.translation) issues.push({ verbId: id, field: "translation", message: "Missing translation" });

    if (!VALID_GROUP_IDS.has(verb.groupId)) {
      issues.push({ verbId: id, field: "groupId", message: `Unknown groupId: ${verb.groupId}` });
    }

    if (seenInfinitives.has(verb.infinitive)) {
      issues.push({ verbId: id, field: "infinitive", message: `Duplicate infinitive: ${verb.infinitive}` });
    }
    seenInfinitives.add(verb.infinitive);

    if (!verb.examples?.pastSimple || !verb.examples?.presentPerfect) {
      issues.push({ verbId: id, field: "examples", message: "Missing pastSimple/presentPerfect example" });
    }

    const sentences = verb.shadowing?.sentenceTexts ?? [];
    if (sentences.length < 2) {
      issues.push({ verbId: id, field: "shadowing.sentenceTexts", message: "Need at least 2 sentences" });
    }
    if (!verb.shadowing?.formsText) {
      issues.push({ verbId: id, field: "shadowing.formsText", message: "Missing formsText" });
    }
  }

  return issues;
}


export const VERBS_BY_ID: Record<string, Verb> = Object.fromEntries(
  VERBS.map((vb) => [vb.id, vb]),
);

export const VERBS_BY_GROUP: Record<string, Verb[]> = VERBS.reduce(
  (acc, vb) => {
    (acc[vb.groupId] ||= []).push(vb);
    return acc;
  },
  {} as Record<string, Verb[]>,
);
