export function VoteValueDisplay({ value }: { value: string }) {
  if (value === "coffee") {
    return (
      <>
        <span aria-hidden="true">☕</span>
        <span className="sr-only">Coffee break</span>
      </>
    );
  }
  return <>{value}</>;
}
