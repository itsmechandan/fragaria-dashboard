// src/pages/NodePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../app/firebase";
import { get, ref } from "firebase/database";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Row = {
  t_utc: number;        // epoch seconds (gateway writes this)
  node_id: number;
  co2_ppm: number;
  t_c: number;
  rh_pct: number;
  light_lux?: number | null;
  batt?: number;
  rssi?: number;
};

// ---- tweak if your gateway id changes
const GATEWAY_ID = "GW01";
const BRAND = "#0094fe";

// util: today as UTC "YYYY-MM-DD" (your RTDB uses UTC buckets)
const todayUtc = () => new Date().toISOString().slice(0, 10);

// util: pretty IST time
const toISTTime = (sec: number) =>
  new Date(sec * 1000).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });

// util: pretty IST date+time
const toISTDateTime = (sec: number) =>
  new Date(sec * 1000).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

export default function NodePage() {
  const { nodeId = "1" } = useParams();

  const [date, setDate] = useState<string>(todayUtc);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<
    "co2_ppm" | "t_c" | "rh_pct" | "light_lux" | "batt"
  >("co2_ppm");

  useEffect(() => {
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, nodeId]);

  async function loadDay() {
    setLoading(true);
    try {
      const snap = await get(ref(db, `readings/${GATEWAY_ID}/${date}`));
      const list: Row[] = [];
      if (snap.exists()) {
        snap.forEach((c) => {
          const v = c.val() as Row;
          if (String(v.node_id) === String(nodeId)) list.push(v);
        });
      }
      list.sort((a, b) => a.t_utc - b.t_utc);
      setRows(list);
    } finally {
      setLoading(false);
    }
  }

  // Graph data
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        time: toISTTime(r.t_utc),
        co2_ppm: r.co2_ppm,
        t_c: r.t_c,
        rh_pct: r.rh_pct,
        light_lux: r.light_lux ?? 0,
        batt: r.batt ?? 0,
      })),
    [rows]
  );

  // Excel export
  function exportExcel() {
    const data = rows.map((r) => ({
      Time_IST: toISTDateTime(r.t_utc),
      CO2_ppm: r.co2_ppm,
      Temp_C: r.t_c,
      RH_pct: r.rh_pct,
      Lux: r.light_lux ?? null,
      Battery: r.batt ?? null,
      RSSI: r.rssi ?? null,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Readings");
    XLSX.writeFile(wb, `node-${nodeId}-${date}.xlsx`);
  }

  return (
    <>
      <style>{`
        body{ background:#000; color:#e5e7eb; }
        .wrap{ max-width:1200px; margin:0 auto; padding:20px 14px 40px; font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial,"Noto Sans",sans-serif;}
        .top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .title{ display:flex; align-items:center; gap:10px; }
        h1{ margin:0; font-size:28px; font-weight:900; color:${BRAND}; }
        a{ color:#e5e7eb; text-decoration:none; }
        .card{ background:#0b0f19; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px; }
        .controls{ display:flex; gap:10px; align-items:center; margin:12px 0 16px; flex-wrap:wrap; }
        input[type="date"], select{
          background:#0b0f19; color:#e5e7eb; border:1px solid rgba(255,255,255,.2); border-radius:10px; padding:8px 10px;
        }
        .btn{ background:#111827; color:#e5e7eb; border:1px solid rgba(255,255,255,.18); padding:8px 12px; border-radius:10px; cursor:pointer; }
        .btn.brand{ background:${BRAND}; color:#fff; border-color:${BRAND}; }
        table{ width:100%; border-collapse:separate; border-spacing:0 8px; }
        th,td{ padding:10px 12px; }
        th{ color:#a7b0be; font-weight:600; text-align:left; font-size:12px; letter-spacing:.02em;}
        tbody tr{ background:#0b0f19; border:1px solid rgba(255,255,255,.1); }
        tbody tr td:first-child{ border-top-left-radius:10px; border-bottom-left-radius:10px; }
        tbody tr td:last-child { border-top-right-radius:10px; border-bottom-right-radius:10px; }
        .grid{ display:grid; grid-template-columns: 1fr; gap:14px; }
        .chartCard{ height:340px; }
        .muted{ color:#94a3b8; font-size:12px; }
      `}</style>

      <div className="wrap">
        <div className="top">
          <div className="title">
            <h1>Node {nodeId} — Readings</h1>
          </div>
          <Link to="/">← Back to Overview</Link>
        </div>

        {/* Controls */}
        <div className="controls">
          <label className="muted">Date (UTC)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className="muted" style={{ marginLeft: 6 }}>
            Metric
          </label>
          <select
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as
                | "co2_ppm"
                | "t_c"
                | "rh_pct"
                | "light_lux"
                | "batt")
            }
          >
            <option value="co2_ppm">CO₂ (ppm)</option>
            <option value="t_c">Temp (°C)</option>
            <option value="rh_pct">RH (%)</option>
            <option value="light_lux">Lux</option>
            <option value="batt">Battery</option>
          </select>

          <button className="btn" onClick={loadDay} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button className="btn brand" onClick={exportExcel} disabled={!rows.length}>
            Export to Excel
          </button>
        </div>

        <div className="grid">
          {/* Chart */}
          <div className="card chartCard">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 18, left: -8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" tick={{ fill: "#cbd5e1" }} />
                <YAxis tick={{ fill: "#cbd5e1" }} />
                <Tooltip
                  contentStyle={{ background: "#0b0f19", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10 }}
                  labelStyle={{ color: "#cbd5e1" }}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={BRAND}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="card">
            <div className="muted" style={{ marginBottom: 8 }}>
              {rows.length
                ? `Showing ${rows.length} rows for ${date} (UTC)`
                : "No rows for this date / node"}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Time (IST)</th>
                    <th>CO₂ (ppm)</th>
                    <th>Temp (°C)</th>
                    <th>RH (%)</th>
                    <th>Lux</th>
                    <th>Battery</th>
                    <th>RSSI</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.t_utc}_${r.node_id}`}>
                      <td>{toISTDateTime(r.t_utc)}</td>
                      <td>{r.co2_ppm}</td>
                      <td>{r.t_c}</td>
                      <td>{r.rh_pct}</td>
                      <td>{r.light_lux ?? "—"}</td>
                      <td>{r.batt ?? "—"}</td>
                      <td>{r.rssi ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
