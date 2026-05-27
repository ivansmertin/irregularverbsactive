import type { VerbGroup } from "../types";

export const VERB_GROUPS: VerbGroup[] = [
  {
    id: "aaa",
    title: "A–A–A",
    subtitle: "Все три формы одинаковые",
    description:
      "Глаголы, у которых инфинитив, Past Simple и Past Participle совпадают. Их легко выучить — достаточно запомнить одну форму.",
    patternType: "form",
    examples: ["cut", "put", "hit", "let", "cost", "shut"],
  },
  {
    id: "abb",
    title: "A–B–B",
    subtitle: "Вторая и третья формы одинаковые",
    description:
      "Past Simple и Past Participle совпадают. Большая и удобная группа: запомнили две формы — и готово.",
    patternType: "form",
    examples: ["buy", "think", "bring", "feel", "leave", "keep", "sleep", "build"],
  },
  {
    id: "abc",
    title: "A–B–C",
    subtitle: "Все три формы разные",
    description:
      "Классические «трудные» неправильные глаголы — каждая форма уникальна. Их учат особенно тщательно.",
    patternType: "form",
    examples: ["go", "see", "take", "give", "write", "speak", "eat", "break"],
  },
  {
    id: "aba",
    title: "A–B–A",
    subtitle: "Первая и третья формы одинаковые",
    description:
      "Past Participle совпадает с инфинитивом. Маленькая, но коварная группа.",
    patternType: "form",
    examples: ["come", "become", "run"],
  },
  {
    id: "iau",
    title: "i–a–u",
    subtitle: "Звуковой паттерн: i → a → u",
    description:
      "Глаголы со сменой гласной по схеме i → a → u. Очень музыкальная и узнаваемая группа.",
    patternType: "sound",
    examples: ["begin", "drink", "ring", "sing", "swim"],
  },
  {
    id: "ee-e-e",
    title: "ee → e → e",
    subtitle: "Долгое ee становится коротким e",
    description:
      "Глаголы с долгим [iː], которое в прошедших формах сокращается до короткого [e].",
    patternType: "sound",
    examples: ["keep", "sleep", "feel", "meet", "feed"],
  },
  {
    id: "ought-aught",
    title: "-ought / -aught",
    subtitle: "Прошедшие формы на -ought / -aught",
    description:
      "Глаголы, у которых обе прошедшие формы заканчиваются на -ought или -aught.",
    patternType: "form",
    examples: ["buy", "bring", "think", "fight", "teach", "catch"],
  },
  {
    id: "ow-ew-own",
    title: "-ow / -ew / -own",
    subtitle: "Паттерн -ow → -ew → -own",
    description:
      "Группа глаголов на -ow, которые в Past Simple дают -ew, а в Past Participle — -own.",
    patternType: "form",
    examples: ["know", "grow", "throw", "blow", "fly"],
  },
  {
    id: "ake-ook-aken",
    title: "-ake / -ook / -aken",
    subtitle: "Паттерн -ake → -ook → -aken",
    description: "Глаголы на -ake с характерной сменой форм -ake → -ook → -aken.",
    patternType: "form",
    examples: ["take", "mistake", "shake", "wake"],
  },
  {
    id: "mixed",
    title: "Смешанные паттерны",
    subtitle: "Другие частотные глаголы",
    description:
      "Полезные неправильные глаголы, которые не вписываются в основные паттерны: смешанные окончания, две допустимые третьи формы, редкие переходы гласных.",
    patternType: "form",
    examples: ["show", "prove", "beat", "sew", "sow"],
  },
];

export const GROUP_BY_ID: Record<string, VerbGroup> = Object.fromEntries(
  VERB_GROUPS.map((g) => [g.id, g]),
);
