import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './PRGallery.css';

const JARS = [1, 2, 3];
const AMOUNTS = [1, 2, 3, 4, 5];
const NAME_COLLAPSE_THRESHOLD = 1;

/**
 * Clamp any donation amount to the $1–$5 display buckets.
 * Amounts > 5 land in the $5 box.
 */
function displayBucket(amount) {
  const rounded = Math.floor(Number(amount));
  if (rounded >= 5) return 5;
  if (rounded < 1) return 1;
  return rounded;
}

/**
 * Given an array of raw name strings for ONE box, return the
 * formatted display list applying the "x[Count]" compression rule.
 *
 * Rule: if a name appears MORE THAN 5 times → collapse to "Name x[Count]".
 * Otherwise, list each occurrence individually.
 */
function compressNames(names) {
  // Count occurrences
  const counts = {};
  for (const name of names) {
    counts[name] = (counts[name] || 0) + 1;
  }

  const result = [];
  const handled = new Set();

  for (const name of names) {
    if (handled.has(name)) continue;

    const count = counts[name];
    if (count > NAME_COLLAPSE_THRESHOLD) {
      result.push(`${name} x${count}`);
      handled.add(name);
    } else {
      // Push individual entries (we add them all at once)
      for (let i = 0; i < count; i++) {
        result.push(name);
      }
      handled.add(name);
    }
  }

  return result;
}

/** Build an empty grid structure: jar → amount → [] */
function emptyGrid() {
  const map = {};
  for (const jar of JARS) {
    map[jar] = {};
    for (const amt of AMOUNTS) {
      map[jar][amt] = [];
    }
  }
  return map;
}

export default function PRGallery() {
  const [grid, setGrid] = useState(emptyGrid);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDonations() {
      try {
        const { data, error: fetchError } = await supabase
          .from('donations')
          .select('jar_id, amount, donor_id, donors ( name )');

        if (fetchError) throw fetchError;

        // Build nested map: jar → bucket → [name, name, …]
        const map = emptyGrid();

        for (const row of data) {
          const jar = row.jar_id;
          const bucket = displayBucket(row.amount);
          const name = row.donors?.name ?? 'Anonymous';
          if (map[jar]) {
            map[jar][bucket].push(name);
          }
        }

        setGrid(map);
      } catch (err) {
        console.error('PRGallery fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDonations();
  }, []);

  // ── Always render the grid ─────────────────────────────────────
  return (
    <div className="pr-gallery">
      <h1 className="pr-gallery__title">Dare to Donate</h1>
      <p className="pr-gallery__subtitle">PR Gallery</p>

      {loading && <p className="pr-gallery__loading">Loading donations…</p>}
      {error && <p className="pr-gallery__error">⚠ {error}</p>}

      <div className="pr-gallery__grid">
        {JARS.map((jarId) => (
          <div className="pr-column" key={jarId}>
            <h2 className="pr-column__header">Jar {jarId}</h2>

            {AMOUNTS.map((amt) => {
              const rawNames = grid[jarId][amt];
              const displayNames = compressNames(rawNames);

              return (
                <div className="pr-box" key={amt} id={`jar-${jarId}-amt-${amt}`}>
                  <div className="pr-box__amount">${amt}</div>
                  <div className="pr-box__names">
                    {displayNames.length === 0 ? (
                      <span className="pr-box__empty">—</span>
                    ) : (
                      displayNames.map((name, idx) => (
                        <span className="pr-box__name" key={idx}>
                          {name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
