import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const TREASURER_PASSWORD =
  import.meta.env.VITE_TREASURER_PASSWORD || "caretodare";

const JARS = [
  { id: 1, label: "Jar 1", color: "from-indigo-500 to-purple-600" },
  { id: 2, label: "Jar 2", color: "from-cyan-500 to-blue-600" },
  { id: 3, label: "Jar 3", color: "from-emerald-500 to-teal-600" },
];

export default function TreasurerDashboard() {
  /* ───── auth state ───── */
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  /* ───── state ───── */
  const [donorName, setDonorName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState(null);
  const [selectedJars, setSelectedJars] = useState({});
  const [amounts, setAmounts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }

  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  /* ───── donor search with debounce ───── */
  useEffect(() => {
    if (donorName.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("donors")
        .select("id, name")
        .ilike("name", `%${donorName}%`)
        .limit(8)
        .abortSignal(controller.signal);

      if (!error && data) {
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [donorName]);

  /* close suggestions when clicking outside */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ───── handlers ───── */
  const pickSuggestion = useCallback((donor) => {
    setDonorName(donor.name);
    setSelectedDonorId(donor.id);
    setShowSuggestions(false);
  }, []);

  const toggleJar = useCallback((jarId) => {
    setSelectedJars((prev) => {
      const next = { ...prev, [jarId]: !prev[jarId] };
      if (!next[jarId]) {
        setAmounts((a) => {
          const copy = { ...a };
          delete copy[jarId];
          return copy;
        });
      }
      return next;
    });
  }, []);

  const setJarAmount = useCallback((jarId, value) => {
    setAmounts((prev) => ({ ...prev, [jarId]: value }));
  }, []);

  /* ───── auto-dismiss toast ───── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ───── submit ───── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = donorName.trim();
    if (!name) return;

    const activeJars = JARS.filter((j) => selectedJars[j.id]);
    if (activeJars.length === 0) {
      setToast({ type: "error", message: "Select at least one jar." });
      return;
    }

    for (const j of activeJars) {
      const amt = parseFloat(amounts[j.id]);
      if (!amt || amt <= 0) {
        setToast({
          type: "error",
          message: `Enter a valid amount for ${j.label}.`,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      /* 1. resolve or create donor */
      let donorId = selectedDonorId;

      if (!donorId) {
        // check if exact name exists
        const { data: existing } = await supabase
          .from("donors")
          .select("id")
          .eq("name", name)
          .maybeSingle();

        if (existing) {
          donorId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("donors")
            .insert({ name })
            .select("id")
            .single();

          if (createErr) throw createErr;
          donorId = created.id;
        }
      }

      /* 2. batch insert donations */
      const rows = activeJars.map((j) => ({
        donor_id: donorId,
        jar_id: j.id,
        amount: parseFloat(amounts[j.id]),
      }));

      const { error: insertErr } = await supabase
        .from("donations")
        .insert(rows);

      if (insertErr) throw insertErr;

      /* 3. reset */
      setDonorName("");
      setSelectedDonorId(null);
      setSelectedJars({});
      setAmounts({});
      setToast({ type: "success", message: "Donation recorded successfully!" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err.message || "Submission failed." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── password handler ───── */
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === TREASURER_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  /* ───── render helpers ───── */
  const anyJarSelected = JARS.some((j) => selectedJars[j.id]);

  /* ───── password gate ───── */
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-surface text-white flex items-center justify-center p-4">
        <form
          onSubmit={handlePasswordSubmit}
          className="w-full max-w-sm bg-surface-light/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 space-y-6"
        >
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
              Treasurer Dashboard
            </h1>
            <p className="text-sm text-slate-400">Enter password to continue</p>
          </div>

          <div>
            <label
              htmlFor="treasurer-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Password
            </label>
            <input
              id="treasurer-password"
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              placeholder="Enter password…"
              autoComplete="off"
              className="w-full rounded-xl bg-surface border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
            />
            {passwordError && (
              <p className="mt-2 text-sm text-error">Incorrect password.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 font-bold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/50 hover:brightness-110"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-white flex items-center justify-center p-4">
      {/* toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-md transition-all animate-[slideIn_0.3s_ease] ${
            toast.type === "success"
              ? "bg-success/20 text-success border border-success/30"
              : "bg-error/20 text-error border border-error/30"
          }`}
        >
          <span className="text-lg">{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-surface-light/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 space-y-6"
      >
        {/* header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
            Treasurer Dashboard
          </h1>
          <p className="text-sm text-slate-400">Record a new donation</p>
        </div>

        {/* donor name */}
        <div className="relative">
          <label
            htmlFor="donor-name"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
          >
            Donor Name
          </label>
          <input
            ref={inputRef}
            id="donor-name"
            type="text"
            value={donorName}
            onChange={(e) => {
              setDonorName(e.target.value);
              setSelectedDonorId(null); // reset if user edits
            }}
            placeholder="Start typing a name…"
            autoComplete="off"
            className="w-full rounded-xl bg-surface border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
          />

          {/* autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-xl bg-surface border border-white/10 shadow-xl divide-y divide-white/5"
            >
              {suggestions.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(d)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/20 transition"
                  >
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* jar checkboxes */}
        <fieldset className="space-y-3">
          <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Select Jars
          </legend>

          <div className="grid grid-cols-3 gap-3">
            {JARS.map((jar) => {
              const active = !!selectedJars[jar.id];
              return (
                <label
                  key={jar.id}
                  className={`relative cursor-pointer select-none rounded-xl p-[2px] transition-all duration-200 ${
                    active
                      ? `bg-gradient-to-br ${jar.color} shadow-lg shadow-primary/20`
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div
                    className={`rounded-[10px] px-3 py-3 text-center text-sm font-semibold transition ${
                      active ? "bg-surface-light text-white" : "text-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleJar(jar.id)}
                      className="sr-only"
                    />
                    {jar.label}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* per-jar amount inputs */}
        {anyJarSelected && (
          <div className="space-y-3 animate-[fadeIn_0.25s_ease]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Donation Amounts
            </p>
            {JARS.filter((j) => selectedJars[j.id]).map((jar) => (
              <div key={jar.id} className="flex items-center gap-3">
                <span
                  className={`shrink-0 w-20 text-xs font-bold bg-gradient-to-r ${jar.color} bg-clip-text text-transparent`}
                >
                  {jar.label}
                </span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amounts[jar.id] ?? ""}
                    onChange={(e) => setJarAmount(jar.id, e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl bg-surface border border-white/10 pl-7 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* submit */}
        <button
          type="submit"
          disabled={submitting || !donorName.trim() || !anyJarSelected}
          className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 font-bold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/50 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-primary/30 disabled:hover:brightness-100"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Submitting…
            </span>
          ) : (
            "Record Donation"
          )}
        </button>
      </form>
    </div>
  );
}
