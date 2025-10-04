// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authReady } from "./app/firebase";
import { listenLatest, listenDayAverages, getDailySeries } from "./app/rtdb";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const BRAND = "#0094fe";
const GWID = "GW01";

// inline types here to avoid cross-file type issues
type FragariaMetric = "co2_ppm" | "t_c" | "rh_pct" | "light_lux" | "batt";
type Snap = {
  node_id: number;
  t_utc: number;
  co2_ppm?: number;
  t_c?: number;
  rh_pct?: number;
  light_lux?: number | null;
  batt?: number;
};
type Averages = {
  count?: number;
  co2_ppm?: number;
  t_c?: number;
  rh_pct?: number;
  light_lux?: number;
  batt?: number;
};

function toUTCBucket(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function toIST(tsSec?: number) {
  if (!tsSec) return "—";
  const d = new Date(tsSec * 1000);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StatCard(props: { title: string; value?: string | number }) {
  return (
    <div
      style={{
        background: "#0b0f19",
        color: "#e5e7eb",
        borderRadius: 16,
        padding: "18px 20px",
        minWidth: 220,
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 10px 24px rgba(0,0,0,.40)",
      }}
    >
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 6 }}>
        {props.title}
      </div>
      <div style={{ fontWeight: 900, fontSize: 40, color: BRAND, lineHeight: 1 }}>
        {props.value ?? "—"}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  unit,
}: {
  title: string;
  data: Array<{ date: string; value: number }>;
  unit?: string;
}) {
  return (
    <div
      style={{
        background: "#0b0f19",
        color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 16,
        padding: "16px 20px 8px",
      }}
    >
      <div style={{ marginBottom: 8, color: "#94a3b8", fontSize: 14 }}>{title}</div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,.06)" />
            <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              label={
                unit
                  ? { value: unit, angle: -90, position: "insideLeft", fill: "#9ca3af" }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "#0b0f19",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 10,
                color: "#e5e7eb",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={BRAND}
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [fbReady, setFbReady] = useState(false);

  const todayUTC = useMemo(() => toUTCBucket(new Date()), []);
  const [selectedNode, setSelectedNode] = useState<"1" | "2" | "3">("1");

  const [latest, setLatest] = useState<Record<string, Snap>>({});
  const [avgByNode, setAvgByNode] = useState<Record<string, Averages>>({});

  // graph state
  const [metric, setMetric] = useState<FragariaMetric>("co2_ppm");
  const [series, setSeries] = useState<Array<{ date: string; value: number }>>([]);

  useEffect(() => {
    authReady().then(() => setFbReady(true));
  }, []);

  useEffect(() => {
    const off = listenLatest(GWID, (map) => setLatest(map || {}));
    return () => off && off();
  }, []);

  useEffect(() => {
    const off = listenDayAverages(GWID, todayUTC, (byNode) =>
      setAvgByNode(byNode || {})
    );
    return () => off && off();
  }, [todayUTC]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getDailySeries(GWID, selectedNode, metric, 30);
        setSeries(s);
      } catch {
        setSeries([]);
      }
    })();
  }, [selectedNode, metric]);

  const avg = avgByNode[selectedNode] || {};
  const lastTs = latest[selectedNode]?.t_utc;

  const FbBadge = (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 18,
        background: "#0b0f19",
        color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,.14)",
        borderRadius: 999,
        padding: "8px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
      title="Firebase status"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: fbReady ? "#22c55e" : "#ef4444",
          boxShadow: fbReady ? "0 0 10px #22c55e" : "0 0 10px #ef4444",
        }}
      />
      Firebase
    </div>
  );

  return (
    <>
      <style>{`
        body { background:#000; color:#e5e7eb; }
        .wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px 90px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
        }
        h1 {
          margin: 8px 0 26px;
          font-size: 64px;
          font-weight: 900;
          color: ${BRAND};
          text-align: center;
        }
        .straw { text-align:center; font-size:54px; line-height:1; margin-top:6px; }
        .nodes-row { display:flex; gap:12px; margin: 10px 0 18px; }
        .tab {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.18);
          background: #0b0f19;
          color: #e5e7eb;
          cursor: pointer;
        }
        .tab.active {
          border-color: ${BRAND};
          box-shadow: inset 0 0 0 1px ${BRAND};
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(200px, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }
        .meta-row {
          color: #9ca3af; font-size: 12px; margin-top: 10px;
          display:flex; gap:20px; align-items:center;
        }
        .btn {
          background:#0b0f19;color:#e5e7eb;border:1px solid rgba(255,255,255,.14);border-radius:12px;
          padding:10px 12px; cursor:pointer;
        }
        .picker {
          display:flex; align-items:center; gap:10px; margin: 18px 0 10px;
        }
        select {
          background:#0b0f19; color:#e5e7eb; border:1px solid rgba(255,255,255,.14);
          padding:8px 10px; border-radius:10px;
        }
      `}</style>

      {FbBadge}

      <div className="wrap">
        <div className="straw">🍓</div>
        <h1>Welcome to Fragaria!!</h1>

        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>Nodes</div>

        <div className="nodes-row" role="tablist" aria-label="Nodes">
          {(["1", "2", "3"] as const).map((id) => (
            <button
              key={id}
              className={`tab ${selectedNode === id ? "active" : ""}`}
              onClick={() => setSelectedNode(id)}
              aria-selected={selectedNode === id}
              role="tab"
            >
              Node {id}
            </button>
          ))}
        </div>

        <div className="stats">
          <StatCard
            title="Avg CO₂ (ppm)"
            value={
              typeof avg.co2_ppm === "number" ? Math.round(avg.co2_ppm) : undefined
            }
          />
          <StatCard
            title="Avg Temp (°C)"
            value={
              typeof avg.t_c === "number" ? Number(avg.t_c.toFixed(1)) : undefined
            }
          />
          <StatCard
            title="Avg RH (%)"
            value={
              typeof avg.rh_pct === "number"
                ? Number(avg.rh_pct.toFixed(1))
                : undefined
            }
          />
          <StatCard
            title="Avg Lux"
            value={
              typeof avg.light_lux === "number"
                ? Number(avg.light_lux.toFixed(0))
                : undefined
            }
          />
          <StatCard
            title="Avg Battery"
            value={
              typeof avg.batt === "number" ? Math.round(avg.batt) : undefined
            }
          />
        </div>

        <div className="meta-row">
          <span>
            UTC bucket (today):{" "}
            <span style={{ color: "#e5e7eb" }}>{todayUTC}</span>
          </span>
          <span>
            Last update (IST) for Node {selectedNode}:{" "}
            <span style={{ color: "#e5e7eb" }}>{toIST(latest[selectedNode]?.t_utc)}</span>
          </span>
          <button className="btn" onClick={() => navigate(`/node/${selectedNode}`)}>
            Open Node {selectedNode}
          </button>
        </div>

        {/* Metric picker + graph */}
        <div className="picker">
          <span style={{ color: "#94a3b8" }}>Overall running graph:</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as FragariaMetric)}
          >
            <option value="co2_ppm">CO₂ (ppm)</option>
            <option value="t_c">Temp (°C)</option>
            <option value="rh_pct">RH (%)</option>
            <option value="light_lux">Lux</option>
            <option value="batt">Battery</option>
          </select>
          <span style={{ color: "#94a3b8" }}>
            · Node {selectedNode} · last 30 days
          </span>
        </div>

        <ChartCard
          title="Daily average"
          data={series}
          unit={
            metric === "co2_ppm"
              ? "ppm"
              : metric === "t_c"
              ? "°C"
              : metric === "rh_pct"
              ? "%"
              : metric === "batt"
              ? "lvl"
              : "lux"
          }
        />
      </div>

      {/* Floating Thresholds button (bottom-left) */}
      <Link
        to="/settings"
        title="Edit thresholds"
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 1000,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.14)",
          background: "#0b0f19",
          color: "#e5e7eb",
          textDecoration: "none",
          boxShadow: "0 8px 20px rgba(0,0,0,.35)",
        }}
      >
        <span style={{ fontSize: 16 }}>⚙️</span>
        <span>Thresholds</span>
      </Link>
    </>
  );
}
