export type Frequency = "high" | "medium" | "low";

export type Verb = {
  id: string;
  infinitive: string;
  pastSimple: string;
  pastParticiple: string;
  alternativePastParticiple?: string[];
  alternativePastSimple?: string[];
  translation: string;
  groupId: string;
  pattern?: string;
  frequency: Frequency;
  examples: {
    pastSimple: string;
    presentPerfect: string;
    passive?: string;
  };
  hint?: string;
  shadowing: {
    formsText: string;
    sentenceTexts: string[];
    recommendedSpeed: "slow" | "normal";
  };
};

export type VerbGroup = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  patternType: "form" | "sound";
  examples: string[];
};

export type UserVerbProgress = {
  verbId: string;
  correctCount: number;
  wrongCount: number;
  streak: number;
  masteryLevel: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  isWeak: boolean;
};

export type ShadowingProgress = {
  verbId: string;
  listenCount: number;
  shadowingCount: number;
  lastPracticedAt?: string;
  preferredAccent?: Accent;
  preferredSpeed?: SpeechSpeed;
  confidence: "low" | "medium" | "high";
  isWeakForShadowing: boolean;
};

export type Accent = "british" | "american";
export type SpeechSpeed = "slow" | "normal" | "fast";

export type SpeechRequest = {
  text: string;
  accent: Accent;
  speed: SpeechSpeed;
  type: "verb_forms" | "sentence" | "group_sequence";
};

export type SpeechResult = {
  durationMs?: number;
  provider: string;
  /** Accent that was requested. */
  accent?: Accent;
};

export type Difficulty = "easy" | "standard" | "hard";

export type Settings = {
  defaultQuestionCount: 5 | 10 | 20 | 30;
  showTranslation: boolean;
  showExamples: boolean;
  difficulty: Difficulty;
  defaultAccent: Accent;
  defaultSpeed: SpeechSpeed;
  pauseAfterSpeakerSec: 1 | 2 | 3 | 5;
  repeatPhraseCount: 1 | 2 | 3;
};

export type PracticeSession = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  total: number;
  /** Count of fully-correct answers (integer). */
  correct: number;
  /** Count of "почти" self-check answers (integer). Optional for v1 compatibility. */
  almost?: number;
  /** Count of wrong answers (integer). Optional for v1 compatibility. */
  wrong?: number;
  mode: string;
};
