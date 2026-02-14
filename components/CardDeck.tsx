import { useState, useRef, useCallback, type KeyboardEvent } from "react";
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setButtonRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      buttonRefs.current[index] = el;
    },
    []
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        nextIndex = (focusedIndex + 1) % CARD_VALUES.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        nextIndex = (focusedIndex - 1 + CARD_VALUES.length) % CARD_VALUES.length;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = CARD_VALUES.length - 1;
        break;
    }

    if (nextIndex !== null) {
      setFocusedIndex(nextIndex);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Select Your Estimate</h2>
      <div
        role="radiogroup"
        aria-label="Estimation cards"
        className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3"
        onKeyDown={handleKeyDown}
      >
        {CARD_VALUES.map((value, index) => (
          <button
            key={value}
            ref={setButtonRef(index)}
            onClick={() => onSelectCard(value)}
            onFocus={() => setFocusedIndex(index)}
            disabled={disabled}
            tabIndex={index === focusedIndex ? 0 : -1}
            className={`
              aspect-[3/4] sm:aspect-[2/3] rounded-lg border-2 font-bold sm:font-semibold text-2xl sm:text-lg
              shadow-sm sm:shadow-none
              transition-all duration-200
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              ${
                selectedValue === value
                  ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                  : "border-foreground/20 sm:border-border bg-card hover:border-primary/50 hover:bg-muted"
              }
            `}
            role="radio"
            aria-checked={selectedValue === value}
            aria-label={`Select ${value}`}
          >
            {value === "coffee" ? <span aria-hidden="true">☕</span> : value}
          </button>
        ))}
      </div>
      {selectedValue && (
        <p className="mt-2 sm:mt-4 text-sm text-muted-foreground" aria-live="polite">
          Selected: <span className="font-semibold">{selectedValue}</span>
        </p>
      )}
    </div>
  );
}
