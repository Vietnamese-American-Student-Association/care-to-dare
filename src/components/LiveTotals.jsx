import { useEffect, useRef } from "react";
import { useLiveTotals } from "../hooks/useLiveTotals";
import "./LiveTotals.css";

const JAR_LABELS = {
  1: "Jar 1",
  2: "Jar 2",
  3: "Jar 3",
};

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/**
 * Stat-card that briefly plays a pulse animation whenever its value changes.
 */
function StatCard({ label, value, loading, variant }) {
  const cardRef = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && cardRef.current) {
      cardRef.current.classList.remove("live-totals__card--pulse");
      // Force reflow so re-adding the class restarts the animation
      void cardRef.current.offsetWidth;
      cardRef.current.classList.add("live-totals__card--pulse");
    }
    prevValue.current = value;
  }, [value]);

  const cardClass = [
    "live-totals__card",
    variant === "grand" ? "live-totals__card--grand" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={cardRef} className={cardClass}>
      <p className="live-totals__label">{label}</p>
      {loading ? (
        <div className="live-totals__skeleton" />
      ) : (
        <p className="live-totals__value">{currencyFmt.format(value)}</p>
      )}
    </div>
  );
}

/**
 * Live Totals banner — renders grand total + per-jar breakdowns.
 * Place this at the top of the page for an at-a-glance fundraising view.
 */
export default function LiveTotals() {
  const { grandTotal, jarTotals, loading } = useLiveTotals();

  return (
    <section className="live-totals" aria-label="Live donation totals">
      <StatCard
        label="Grand Total"
        value={grandTotal}
        loading={loading}
        variant="grand"
      />
      {[1, 2, 3].map((jarId) => (
        <StatCard
          key={jarId}
          label={JAR_LABELS[jarId]}
          value={jarTotals[jarId]}
          loading={loading}
        />
      ))}
    </section>
  );
}
