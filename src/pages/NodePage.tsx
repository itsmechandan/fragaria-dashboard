import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listenDayReadingsForNode, type Snap } from "../app/rtdb";

const brand = "#0094fe";

function fmtIST(epochSec: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(epochSec * 1000));
}

export default function NodePage() {
  const { id } = useParams();
  const nodeId = Number(id);
  const [rows, setRows] = useState<Snap[]>([]);

  useEffect(() => {
    const unsub = listenDayReadingsForNode("GW01", nodeId, setRows);
    return () => unsub();
  }, [nodeId]);

  const newest = rows[0];
  const summary = useMemo(() => {
    if (!rows.length) return null;
    const avg = (pick: (r: Snap) => number | null | undefined) => {
      const vals = rows.map(pick).map(Number).filter((n) => Number.isFinite(n));
      if (!vals.length) return NaN;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      co2: avg((r) => r.co2_ppm),
      t: avg((r) => r.t_c),
      rh: avg((r) => r.rh_pct),
      lux: avg((r) => r.light_lux ?? NaN),
    };
  }, [rows]);

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <Link to="/" style={{ textDecoration: "none", color: brand }}>← Overview</Link>
      </div>
      <h1 style={{ color: brand, marginBottom: 6 }}>
        Gateway: GW01 • Node {nodeId}
      </h1>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
        {newest ? `Newest: ${fmtIST(newest.t_utc)}` : "Waiting for data…"}
      </div>

      {/* Summary chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
        <Chip label="Avg CO₂ (ppm)" value={summary ? summary.co2 : NaN} />
        <Chip label="Avg Temp (°C)" value={summary ? summary.t : NaN} />
        <Chip label="Avg RH (%)" value={summary ? summary.rh : NaN} />
        <Chip label="Avg Lux" value={summary ? summary.lux : NaN} />
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ maxHeight: 520, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
              <tr>
                {["Time (IST)", "CO₂ (ppm)", "Temp (°C)", "RH (%)", "Lux", "Battery", "Flags"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((r, i) => (
                <tr key={`${r.t_utc}-${i}`} style={{ background: i % 2 ? "#fbfdff" : "#fff" }}>
                  <td style={td}>{fmtIST(r.t_utc)}</td>
                  <td style={td}>{r.co2_ppm}</td>
                  <td style={td}>{r.t_c?.toFixed(2)}</td>
                  <td style={td}>{r.rh_pct?.toFixed(2)}</td>
                  <td style={td}>{r.light_lux ?? "—"}</td>
                  <td style={td}>{r.batt ?? "—"}</td>
                  <td style={td}>{"0x" + ((r.flags ?? 0) & 0xff).toString(16).padStart(2, "0").toUpperCase()}</td>
                </tr>
              )) : (
                <tr><td style={{ padding: 14 }} colSpan={7}>No readings yet for today.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" };

function Chip({ label, value }: { label: string; value: number }) {
  const txt = Number.isFinite(value) ? value.toFixed(1) : "—";
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 12, color: brand }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: brand }}>{txt}</div>
    </div>
  );
}
