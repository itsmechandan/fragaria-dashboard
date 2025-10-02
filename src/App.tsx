import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authReady } from "./app/firebase";
import { listenLatest, type Snap } from "./app/rtdb";

export default function App() {
  const [status, setStatus] = useState<"connecting" | "ok" | "err">("connecting");
  const [latest, setLatest] = useState<Record<string, Snap> | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    authReady
      .then(() => {
        unsub = listenLatest("GW01", (data) => setLatest(data as any));
        setStatus("ok");
      })
      .catch(() => setStatus("err"));
    return () => { if (unsub) unsub(); };
  }, []);

  const rows: Snap[] = latest ? (Object.values(latest) as Snap[]) : [];
  const nodeIds = latest ? Object.keys(latest) : [];

  const avg = (k: keyof Snap) => {
    const vals = rows.map(r => Number((r as any)[k])).filter((n) => Number.isFinite(n));
    if (!vals.length) return NaN;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const fmtIST = (d: Date) =>
    new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium" })
      .format(d);

  const lastUtcSec = rows.length ? Math.max(...rows.map(r => r.t_utc || 0)) : 0;
  const lastWhenIST = lastUtcSec ? fmtIST(new Date(lastUtcSec * 1000)) : "—";

  const co2  = avg("co2_ppm");
  const tC   = avg("t_c");
  const rh   = avg("rh_pct");
  const lux  = avg("light_lux" as any);
  const batt = avg("batt" as any);

  const brand = "#0094fe";

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", padding: 16, lineHeight: 1.35 }}>
      <h1 style={{ color: brand, marginBottom: 12, fontSize: 48 }}>Fragaria — Live Dashboard</h1>

      <div><strong>Firebase:</strong> {status === "connecting" ? "connecting…" : status === "ok" ? "connected" : "error"}</div>

      <div style={{ marginTop: 12 }}>
        <strong>Nodes:</strong> {nodeIds.length ? nodeIds.map(id => (
          <Link key={id} to={`/node/${id}`} style={{ color: brand, marginRight: 8, textDecoration: "none" }}>
            {id}
          </Link>
        )) : "none"}
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Kpi label="Avg CO₂ (ppm)" value={co2} />
        <Kpi label="Avg Temp (°C)" value={tC} />
        <Kpi label="Avg RH (%)" value={rh} />
        <Kpi label="Avg Lux" value={lux} />
        <Kpi label="Avg Battery" value={batt} />
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Last update (IST): {lastWhenIST}
      </div>

      <div style={{ marginTop: 20 }}>
        <strong>Latest snapshot(s)</strong>
        {rows.length ? (
          <ul style={{ marginTop: 8 }}>
            {rows.sort((a,b)=>a.node_id-b.node_id).map((r) => (
              <li key={r.node_id}>
                <Link to={`/node/${r.node_id}`} style={{ color: brand, textDecoration: "none" }}>
                  Node {r.node_id}
                </Link>
                {" — "}
                CO₂ {r.co2_ppm} ppm, T {r.t_c.toFixed(2)} °C, RH {r.rh_pct.toFixed(2)} %, Lux {r.light_lux ?? "—"}, Batt {r.batt ?? "—"}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Waiting for data…</div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  const brand = "#0094fe";
  const txt = Number.isFinite(value) ? value.toFixed(1) : "—";
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 12, color: brand }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: brand }}>{txt}</div>
    </div>
  );
}
