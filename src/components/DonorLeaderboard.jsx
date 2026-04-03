import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import './DonorLeaderboard.css';

const PAGE_SIZE = 10;

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Return a rank-based CSS modifier for the top 3 spots.
 */
function rankVariant(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return null;
}

/**
 * Medal emoji for top 3.
 */
function rankIcon(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function DonorLeaderboard() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  /**
   * Fetch the next page of donors from Supabase.
   * Uses range-based pagination (offset / limit).
   */
  const fetchMore = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const from = donors.length;
      const to = from + PAGE_SIZE - 1;

      const { data, error: fetchError } = await supabase
        .from('donors')
        .select('id, name, total_amount, created_at')
        .gt('total_amount', 0)        // only donors who have donated
        .order('total_amount', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setDonors((prev) => [...prev, ...data]);
    } catch (err) {
      console.error('DonorLeaderboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setHasFetchedOnce(true);
    }
  }, [donors.length]);

  /* ── Fetch initial batch on first render ── */
  if (!hasFetchedOnce && !loading) {
    fetchMore();
  }

  return (
    <section className="donor-lb" aria-label="Donor Leaderboard">
      <h1 className="donor-lb__title">Donor Leaderboard</h1>
      <p className="donor-lb__subtitle">Top Contributors</p>

      {/* Initial loading state */}
      {initialLoading && (
        <p className="donor-lb__loading">Loading leaderboard…</p>
      )}

      {/* Error state */}
      {error && <p className="donor-lb__error">⚠ {error}</p>}

      {/* Empty state */}
      {!initialLoading && donors.length === 0 && !error && (
        <p className="donor-lb__empty">No donations recorded yet.</p>
      )}

      {/* Donor list */}
      {donors.length > 0 && (
        <div className="donor-lb__list">
          {donors.map((donor, idx) => {
            const rank = idx + 1;
            const variant = rankVariant(rank);
            const rowClass = [
              'donor-lb__row',
              variant ? `donor-lb__row--${variant}` : '',
            ]
              .filter(Boolean)
              .join(' ');
            const rankClass = [
              'donor-lb__rank',
              variant ? `donor-lb__rank--${variant}` : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                className={rowClass}
                key={donor.id}
                id={`donor-rank-${rank}`}
              >
                <div className={rankClass}>{rankIcon(rank)}</div>
                <div className="donor-lb__info">
                  <p className="donor-lb__name">{donor.name}</p>
                  <p className="donor-lb__date">
                    Joined {dateFmt.format(new Date(donor.created_at))}
                  </p>
                </div>
                <span className="donor-lb__amount">
                  {currencyFmt.format(donor.total_amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Show-more / end-of-list */}
      {!initialLoading && donors.length > 0 && hasMore && (
        <button
          className="donor-lb__show-more"
          onClick={fetchMore}
          disabled={loading}
          id="donor-show-more"
        >
          {loading && <span className="donor-lb__spinner" />}
          {loading ? 'Loading…' : 'Show More'}
        </button>
      )}

      {!initialLoading && donors.length > 0 && !hasMore && (
        <p className="donor-lb__end">You've reached the end ✦</p>
      )}
    </section>
  );
}
