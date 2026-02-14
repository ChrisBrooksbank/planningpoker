import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardDeck } from "@/components/CardDeck";
import { CARD_VALUES } from "@/lib/types";

describe("CardDeck", () => {
  it("renders all card values", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    // Verify all cards are rendered
    expect(screen.getByLabelText("Select 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 8")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 13")).toBeInTheDocument();
    expect(screen.getByLabelText("Select 21")).toBeInTheDocument();
    expect(screen.getByLabelText("Select ?")).toBeInTheDocument();
    expect(screen.getByLabelText("Select coffee")).toBeInTheDocument();
  });

  it("displays coffee card with coffee emoji", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const coffeeButton = screen.getByLabelText("Select coffee");
    expect(coffeeButton).toHaveTextContent("☕");
  });

  it("calls onSelectCard when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const card5 = screen.getByLabelText("Select 5");
    await user.click(card5);

    expect(onSelectCard).toHaveBeenCalledWith("5");
    expect(onSelectCard).toHaveBeenCalledTimes(1);
  });

  it("highlights selected card", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue="8" onSelectCard={onSelectCard} />);

    const card8 = screen.getByLabelText("Select 8");
    expect(card8).toHaveClass("border-primary", "bg-primary");
    expect(card8).toHaveAttribute("aria-checked", "true");
  });

  it("does not highlight unselected cards", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue="8" onSelectCard={onSelectCard} />);

    const card5 = screen.getByLabelText("Select 5");
    expect(card5).not.toHaveClass("border-primary", "bg-primary");
    expect(card5).toHaveAttribute("aria-checked", "false");
  });

  it("shows selected value text when a card is selected", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue="13" onSelectCard={onSelectCard} />);

    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
    // Use getAllByText since "13" appears in both the button and the selected text
    const thirteenText = screen.getAllByText("13");
    expect(thirteenText.length).toBeGreaterThan(0);
  });

  it("does not show selected value text when no card is selected", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
  });

  it("allows changing selection from one card to another", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    const { rerender } = render(
      <CardDeck selectedValue="5" onSelectCard={onSelectCard} />
    );

    // Initially, card 5 is selected
    expect(screen.getByLabelText("Select 5")).toHaveAttribute(
      "aria-checked",
      "true"
    );

    // Click card 8
    const card8 = screen.getByLabelText("Select 8");
    await user.click(card8);
    expect(onSelectCard).toHaveBeenCalledWith("8");

    // Simulate parent component updating selectedValue
    rerender(<CardDeck selectedValue="8" onSelectCard={onSelectCard} />);

    // Now card 8 should be selected
    expect(screen.getByLabelText("Select 8")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByLabelText("Select 5")).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("disables all cards when disabled prop is true", () => {
    const onSelectCard = vi.fn();
    render(
      <CardDeck selectedValue={null} onSelectCard={onSelectCard} disabled />
    );

    CARD_VALUES.forEach((value) => {
      const card = screen.getByLabelText(`Select ${value}`);
      expect(card).toBeDisabled();
    });
  });

  it("does not call onSelectCard when disabled card is clicked", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(
      <CardDeck selectedValue={null} onSelectCard={onSelectCard} disabled />
    );

    const card5 = screen.getByLabelText("Select 5");
    await user.click(card5);

    expect(onSelectCard).not.toHaveBeenCalled();
  });

  it("renders correct number of cards", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(CARD_VALUES.length);
  });

  it("applies hover styles to unselected cards", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue="5" onSelectCard={onSelectCard} />);

    const card3 = screen.getByLabelText("Select 3");
    expect(card3).toHaveClass("hover:border-primary/50", "hover:bg-muted");
  });

  it("has radiogroup role with aria-label on container", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radiogroup = screen.getByRole("radiogroup");
    expect(radiogroup).toHaveAttribute("aria-label", "Estimation cards");
  });

  it("gives only the first card tabIndex=0 by default", () => {
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("tabindex", "0");
    radios.slice(1).forEach((radio) => {
      expect(radio).toHaveAttribute("tabindex", "-1");
    });
  });

  it("moves focus with ArrowRight key (wrapping)", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    // Focus the first card
    radios[0].focus();
    expect(radios[0]).toHaveFocus();

    // ArrowRight moves to second card
    await user.keyboard("{ArrowRight}");
    expect(radios[1]).toHaveFocus();

    // ArrowRight again moves to third
    await user.keyboard("{ArrowRight}");
    expect(radios[2]).toHaveFocus();
  });

  it("moves focus with ArrowLeft key (wrapping)", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    // Focus the first card
    radios[0].focus();

    // ArrowLeft wraps to last card
    await user.keyboard("{ArrowLeft}");
    expect(radios[radios.length - 1]).toHaveFocus();
  });

  it("moves focus to first card with Home key", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    // Focus the first card, move right twice
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");
    expect(radios[2]).toHaveFocus();

    // Home goes back to first
    await user.keyboard("{Home}");
    expect(radios[0]).toHaveFocus();
  });

  it("moves focus to last card with End key", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    radios[0].focus();

    await user.keyboard("{End}");
    expect(radios[radios.length - 1]).toHaveFocus();
  });

  it("selects card on Enter key", async () => {
    const user = userEvent.setup();
    const onSelectCard = vi.fn();
    render(<CardDeck selectedValue={null} onSelectCard={onSelectCard} />);

    const radios = screen.getAllByRole("radio");
    // Focus first card, move to second, press Enter
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Enter}");

    expect(onSelectCard).toHaveBeenCalledWith(CARD_VALUES[1]);
  });
});
