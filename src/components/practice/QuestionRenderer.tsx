import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { checkAllForms, checkInfinitiveTriple, checkPastSimple } from "@/lib/answer";
import { getOrInitProgress, markSelfCheck, recordAnswer } from "@/lib/progress";
import { buildChoiceOptionsPP, maskForm } from "@/lib/practice/generation";
import {
  WEAK_VERB_NOTE,
  explainChoicePP,
  explainChoicePS,
  explainFill,
  explainRuEn,
  explainSelfCheck,
} from "@/lib/practice/explanations";
import type { ConcreteMode, Difficulty } from "@/lib/practice/types";
import type { Verb } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FeedbackBlock } from "./FeedbackBlock";

export type AnswerResult = "correct" | "wrong" | "almost";

export type AnswerDetail = {
  result: AnswerResult;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  becameWeak: boolean;
};

export type QuestionRendererProps = {
  verb: Verb;
  mode: ConcreteMode;
  difficulty: Difficulty;
  showTranslation: boolean;
  onResult: (detail: AnswerDetail) => void;
  onNext: () => void;
};

export function QuestionRenderer(props: QuestionRendererProps) {
  const { verb, mode, difficulty, showTranslation, onResult, onNext } = props;

  const effShowTranslation =
    difficulty === "easy" ? true : difficulty === "hard" ? false : showTranslation;
  const showHintUpfront = difficulty === "easy" && !!verb.hint;
  const showHintOnError = difficulty !== "hard" && !!verb.hint;

  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [becameWeak, setBecameWeak] = useState(false);

  const [ps, setPs] = useState("");
  const [pp, setPp] = useState("");
  const [tripleInput, setTripleInput] = useState("");
  const [choice, setChoice] = useState<string>("");

  function finish(opts: {
    result: AnswerResult;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }) {
    const wasWeak = getOrInitProgress(verb.id).isWeak;
    if (mode !== "self_check") {
      if (opts.result === "correct") recordAnswer(verb.id, true);
      else if (opts.result === "wrong") recordAnswer(verb.id, false);
      // "almost" can only happen in self_check, handled below
    }
    const nowWeak = getOrInitProgress(verb.id).isWeak;
    const transitionedWeak = !wasWeak && nowWeak;

    const fullExplanation = transitionedWeak
      ? `${opts.explanation} ${WEAK_VERB_NOTE}`
      : opts.explanation;

    setSubmitted(true);
    setIsCorrect(opts.result === "correct");
    setExplanation(fullExplanation);
    setBecameWeak(transitionedWeak);
    onResult({
      result: opts.result,
      userAnswer: opts.userAnswer,
      correctAnswer: opts.correctAnswer,
      explanation: fullExplanation,
      becameWeak: transitionedWeak,
    });
  }

  const choicePPSentence = useMemo(
    () => maskForm(verb.examples.presentPerfect, verb.pastParticiple),
    [verb.id, verb.examples.presentPerfect, verb.pastParticiple],
  );
  const choicePSSentence = useMemo(
    () => maskForm(verb.examples.pastSimple, verb.pastSimple),
    [verb.id, verb.examples.pastSimple, verb.pastSimple],
  );
  const choiceOptionsPP = useMemo(() => buildChoiceOptionsPP(verb), [verb.id]);

  const correctTriple = `${verb.infinitive} — ${verb.pastSimple} — ${verb.pastParticiple}`;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {mode === "fill" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (submitted) {
                onNext();
                return;
              }
              const ok = checkAllForms(verb, ps, pp);
              finish({
                result: ok ? "correct" : "wrong",
                userAnswer: `${ps || "—"} / ${pp || "—"}`,
                correctAnswer: `${verb.pastSimple} — ${verb.pastParticiple}`,
                explanation: explainFill(verb, ok),
              });
            }}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Заполните пропущенные формы
            </div>
            <div className="rounded-md bg-secondary/50 p-4 text-center font-mono text-xl">
              {verb.infinitive} — ____ — ____
            </div>
            {effShowTranslation && (
              <div className="text-sm text-muted-foreground">
                Перевод: <span className="text-foreground">{verb.translation}</span>
              </div>
            )}
            {showHintUpfront && (
              <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                Подсказка: {verb.hint}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Past Simple</Label>
                <Input
                  autoFocus
                  value={ps}
                  onChange={(e) => setPs(e.target.value)}
                  disabled={submitted}
                  placeholder="2-я форма"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />
              </div>
              <div>
                <Label className="text-xs">Past Participle</Label>
                <Input
                  value={pp}
                  onChange={(e) => setPp(e.target.value)}
                  disabled={submitted}
                  placeholder="3-я форма"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                />
              </div>
            </div>
            {!submitted ? (
              <Button type="submit" className="w-full">
                Проверить
              </Button>
            ) : (
              <>
                <FeedbackBlock ok={isCorrect} text={explanation} onNext={onNext} />
                {!isCorrect && showHintOnError && verb.hint && (
                  <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    Подсказка: {verb.hint}
                  </div>
                )}
                {becameWeak && <div className="text-xs text-amber-700">{WEAK_VERB_NOTE}</div>}
              </>
            )}
          </form>
        )}

        {mode === "choice_pp" && (
          <>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Выберите правильную форму
            </div>
            <div className="rounded-md bg-secondary/50 p-4 text-center text-base md:text-lg">
              {choicePPSentence}
            </div>
            <RadioGroup
              value={choice}
              onValueChange={setChoice}
              disabled={submitted}
              className="grid gap-2"
            >
              {choiceOptionsPP.map((opt) => (
                <label
                  key={opt}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                    submitted && opt === verb.pastParticiple && "border-emerald-500 bg-emerald-50",
                    submitted &&
                      choice === opt &&
                      opt !== verb.pastParticiple &&
                      "border-red-500 bg-red-50",
                  )}
                >
                  <RadioGroupItem value={opt} />
                  <span className="font-mono">{opt}</span>
                </label>
              ))}
            </RadioGroup>
            {!submitted ? (
              <Button
                className="w-full"
                disabled={!choice}
                onClick={() => {
                  const ok = choice === verb.pastParticiple;
                  finish({
                    result: ok ? "correct" : "wrong",
                    userAnswer: choice || "—",
                    correctAnswer: verb.pastParticiple,
                    explanation: explainChoicePP(verb, ok),
                  });
                }}
              >
                Проверить
              </Button>
            ) : (
              <FeedbackBlock ok={isCorrect} text={explanation} onNext={onNext} />
            )}
          </>
        )}

        {mode === "choice_ps_pp" && (
          <>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Past Simple или Past Participle?
            </div>
            <div className="rounded-md bg-secondary/50 p-4 text-center text-base md:text-lg">
              {choicePSSentence}
            </div>
            <RadioGroup
              value={choice}
              onValueChange={setChoice}
              disabled={submitted}
              className="grid grid-cols-2 gap-2"
            >
              {[verb.pastSimple, verb.pastParticiple].map((opt) => (
                <label
                  key={opt}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                    submitted && opt === verb.pastSimple && "border-emerald-500 bg-emerald-50",
                    submitted &&
                      choice === opt &&
                      opt !== verb.pastSimple &&
                      "border-red-500 bg-red-50",
                  )}
                >
                  <RadioGroupItem value={opt} />
                  <span className="font-mono">{opt}</span>
                </label>
              ))}
            </RadioGroup>
            {!submitted ? (
              <Button
                className="w-full"
                disabled={!choice}
                onClick={() => {
                  const ok = checkPastSimple(verb, choice);
                  finish({
                    result: ok ? "correct" : "wrong",
                    userAnswer: choice || "—",
                    correctAnswer: verb.pastSimple,
                    explanation: explainChoicePS(verb, ok),
                  });
                }}
              >
                Проверить
              </Button>
            ) : (
              <FeedbackBlock ok={isCorrect} text={explanation} onNext={onNext} />
            )}
          </>
        )}

        {mode === "ru_en" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (submitted) {
                onNext();
                return;
              }
              const ok = checkInfinitiveTriple(verb, tripleInput);
              finish({
                result: ok ? "correct" : "wrong",
                userAnswer: tripleInput || "—",
                correctAnswer: correctTriple,
                explanation: explainRuEn(verb, ok),
              });
            }}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Переведите и назовите три формы
            </div>
            <div className="rounded-md bg-secondary/50 p-4 text-center text-xl">
              {verb.translation}
            </div>
            <Input
              autoFocus
              placeholder="инфинитив — past simple — past participle"
              value={tripleInput}
              onChange={(e) => setTripleInput(e.target.value)}
              disabled={submitted}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
            />
            <p className="text-xs text-muted-foreground">
              Разделяйте формы через пробел, дефис, тире, запятую или «/».
            </p>
            {!submitted ? (
              <Button type="submit" className="w-full">
                Проверить
              </Button>
            ) : (
              <FeedbackBlock ok={isCorrect} text={explanation} onNext={onNext} />
            )}
          </form>
        )}

        {mode === "self_check" && (
          <>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Быстрая самопроверка
            </div>
            <div className="rounded-md bg-secondary/50 p-4 text-center">
              <div className="font-mono text-2xl">{verb.infinitive} — ? — ?</div>
              {effShowTranslation && (
                <div className="mt-2 text-sm text-muted-foreground">{verb.translation}</div>
              )}
            </div>
            {!submitted ? (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    markSelfCheck(verb.id, "unknown");
                    finish({
                      result: "wrong",
                      userAnswer: "Не знал",
                      correctAnswer: correctTriple,
                      explanation: explainSelfCheck(verb, "unknown"),
                    });
                  }}
                >
                  Не знал
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    markSelfCheck(verb.id, "almost");
                    finish({
                      result: "almost",
                      userAnswer: "Почти",
                      correctAnswer: correctTriple,
                      explanation: explainSelfCheck(verb, "almost"),
                    });
                  }}
                >
                  Почти
                </Button>
                <Button
                  onClick={() => {
                    markSelfCheck(verb.id, "known");
                    finish({
                      result: "correct",
                      userAnswer: "Знал",
                      correctAnswer: correctTriple,
                      explanation: explainSelfCheck(verb, "known"),
                    });
                  }}
                >
                  Знал
                </Button>
              </div>
            ) : (
              <FeedbackBlock ok={isCorrect} text={explanation} onNext={onNext} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
