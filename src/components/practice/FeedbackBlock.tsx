import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeedbackBlock({
  ok,
  text,
  onNext,
}: {
  ok: boolean;
  text: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border p-3 text-sm",
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900",
        )}
      >
        {ok ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <X className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{text}</span>
      </div>
      <Button className="w-full" onClick={onNext}>
        Следующий <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
