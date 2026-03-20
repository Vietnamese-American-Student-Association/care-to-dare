import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Custom hook that provides live donation totals via Supabase Realtime.
 *
 * - On mount, fetches all existing donations to compute initial totals.
 * - Subscribes to postgres_changes INSERT events on the `donations` table.
 * - On each new row, updates local state immediately (no extra DB call).
 * - Cleans up the subscription on unmount.
 *
 * @returns {{ grandTotal: number, jarTotals: { 1: number, 2: number, 3: number }, loading: boolean }}
 */
export function useLiveTotals() {
  const [grandTotal, setGrandTotal] = useState(0);
  const [jarTotals, setJarTotals] = useState({ 1: 0, 2: 0, 3: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── 1. Fetch initial totals ──────────────────────────────────────
    async function fetchInitialTotals() {
      const { data, error } = await supabase
        .from("donations")
        .select("jar_id, amount");

      if (error) {
        console.error("Failed to fetch initial donation totals:", error);
        setLoading(false);
        return;
      }

      let total = 0;
      const jars = { 1: 0, 2: 0, 3: 0 };

      for (const row of data) {
        const amount = parseFloat(row.amount);
        total += amount;
        jars[row.jar_id] = (jars[row.jar_id] || 0) + amount;
      }

      setGrandTotal(total);
      setJarTotals(jars);
      setLoading(false);
    }

    fetchInitialTotals();

    // ── 2. Subscribe to realtime INSERT events ──────────────────────
    const channel = supabase
      .channel("live-totals")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "donations",
        },
        (payload) => {
          const { jar_id, amount } = payload.new;
          const parsedAmount = parseFloat(amount);

          setGrandTotal((prev) => prev + parsedAmount);
          setJarTotals((prev) => ({
            ...prev,
            [jar_id]: (prev[jar_id] || 0) + parsedAmount,
          }));
        }
      )
      .subscribe();

    // ── 3. Cleanup ──────────────────────────────────────────────────
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { grandTotal, jarTotals, loading };
}
