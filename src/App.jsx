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

/* Inline styles to avoid CSS-module conflicts with Tailwind */
const styles = {
  nav: {
    display: "flex",
    justifyContent: "center",
    gap: "4px",
    padding: "12px 16px",
    background: "#3A0505",
    borderBottom: "2px solid rgba(255, 215, 0, 0.2)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  tab: {
    fontFamily: "'Anton', Impact, 'Arial Black', sans-serif",
    fontSize: "1rem",
    letterSpacing: "2px",
    textTransform: "uppercase",
    padding: "10px 28px",
    border: "2px solid transparent",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "transparent",
    color: "rgba(255, 215, 0, 0.5)",
  },
  tabActive: {
    background: "rgba(255, 215, 0, 0.12)",
    color: "#FFD700",
    borderColor: "#FFD700",
  },
};

