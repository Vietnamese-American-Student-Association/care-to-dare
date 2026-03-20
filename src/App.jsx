import { useState } from "react";
import TreasurerDashboard from "./components/TreasurerDashboard";
import PRGallery from "./components/PRGallery";
import LiveTotals from "./components/LiveTotals";
import "./index.css";

const PAGES = {
  treasurer:  { label: "Treasurer",   component: TreasurerDashboard },
  gallery:    { label: "PR Gallery",  component: PRGallery },
  liveTotals: { label: "Live Totals", component: LiveTotals },
};

export default function App() {
  const [activePage, setActivePage] = useState("treasurer");
  const ActiveComponent = PAGES[activePage].component;

  return (
    <>
      {/* ── Toggle bar ─────────────────────────────────── */}
      <nav style={styles.nav}>
        {Object.entries(PAGES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActivePage(key)}
            style={{
              ...styles.tab,
              ...(activePage === key ? styles.tabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Active page ────────────────────────────────── */}
      <ActiveComponent />
    </>
  );
}

/* Inline styles — matches the Treasurer Dashboard colour scheme */
const styles = {
  nav: {
    display: "flex",
    justifyContent: "center",
    gap: "4px",
    padding: "12px 16px",
    background: "#0f172a",
    borderBottom: "2px solid rgba(99, 102, 241, 0.2)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  tab: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    fontSize: "0.9rem",
    fontWeight: 600,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    padding: "10px 28px",
    border: "2px solid transparent",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "transparent",
    color: "rgba(99, 102, 241, 0.5)",
  },
  tabActive: {
    background: "rgba(99, 102, 241, 0.12)",
    color: "#818cf8",
    borderColor: "#6366f1",
  },
};

