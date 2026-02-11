import type { CardValue } from "@/lib/types";
import { CARD_VALUES } from "@/lib/types";

interface CardDeckProps {
  selectedValue: CardValue | null;
  onSelectCard: (value: CardValue) => void;
  disabled?: boolean;
}

export function CardDeck({
  selectedValue,
  onSelectCard,
  disabled = false,
}: CardDeckProps) {
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-4">Select Your Estimate</h2>
      <div className="grid grid-cols-5 gap-3">
        {CARD_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => onSelectCard(value)}
            disabled={disabled}
            className={`
              aspect-[2/3] rounded-lg border-2 font-semibold text-lg
              transition-all duration-200
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              ${
                selectedValue === value
                  ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted"
              }
            `}
            aria-label={`Select ${value}`}
            aria-pressed={selectedValue === value}
          >
            {value === "coffee" ? "☕" : value}
          </button>
        ))}
      </div>
      {selectedValue && (
        <p className="mt-4 text-sm text-muted-foreground">
          Selected: <span className="font-semibold">{selectedValue}</span>
        </p>
      )}
    </div>
  );
}
