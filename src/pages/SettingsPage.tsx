// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../app/firebase";
import { onValue, ref, update } from "firebase/database";

type Range = { min?: number; max?: number };
type NodeLimits = {
  co2_ppm?: Range;
  t_c?: Range;
  rh_pct?: Range;
  light_lux?: Range;
  batt?: Range;
};
type AlertsConfig = {
  enabled?: boolean;
  cooldown_min?: number;
  nodes?: Record<string, NodeLimits>;
};

const BRAND = "#0094fe";

export default function SettingsPage() {
  const [cfg, setCfg] = useState<AlertsConfig>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const r = ref(db, "config/alerts");
    const off = onValue(r, (snap) => {
      const val = (snap.val() as AlertsConfig) ?? {};
      // ensure node 1 exists so UI shows fields
      if (!val.nodes) val.nodes = {};
      if (!val.nodes["1"]) val.nodes["1"] = {};
      setCfg(val);
    });
    return () => off();
  }, []);

  function setNodeRange(
    key: keyof NodeLimits,
    field: keyof Range,
    value: number | undefined
  ) {
    setCfg((old) => {
      const next = structuredClone(old) as AlertsConfig;
      next.nodes = next.nodes ?? {};
      next.nodes["1"] = next.nodes["1"] ?? {};
      const range = (next.nodes["1"][key] = next.nodes["1"][key] ?? {});
      if (value === undefined || Number.isNaN(value)) delete range[field];
      else (range as any)[field] = value;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const updates: Record<string, any> = {};
      updates["config/alerts/enabled"] = !!cfg.enabled;
      updates["config/alerts/cooldown_min"] =
        Number(cfg.cooldown_min) || 15;

      const n1 = (cfg.nodes ?? {})["1"] ?? {};
      updates["config/alerts/nodes/1"] = {
        co2_ppm: n1.co2_ppm ?? {},
        t_c: n1.t_c ?? {},
        rh_pct: n1.rh_pct ?? {},
        light_lux: n1.light_lux ?? {},
        batt: n1.batt ?? {},
      };

      await update(ref(db), updates);
      setMsg("Saved ✔");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setMsg("Save failed: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  const n1 = (cfg.nodes ?? {})["1"] ?? {};

  return (
    <>
      <style>{`
        body{background:#000;color:#e5e7eb}
        .wrap{max-width:900px;margin:0 auto;padding:24px 16px 40px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif}
        .title{display:flex;align-items:center;gap:10px}
        h1{margin:10px 0 18px;font-size:34px;font-weight:900;color:${BRAND}}
        .card{background:#0b0f19;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;margin-bottom:16px}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        label{font-size:12px;color:#9ca3af;margin-bottom:6px;display:block}
        input[type="number"]{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#fff;color:#0f172a}
        .switch{display:flex;align-items:center;gap:10px}
        .btns{display:flex;gap:10px;margin-top:14px}
        .btn{background:#fff;color:#0f172a;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;cursor:pointer}
        .btn.save{background:${BRAND};border-color:${BRAND};color:#fff}
        .meta{font-size:12px;color:#9ca3af;margin-top:8px}
        .topnav{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        a{color:#e5e7eb;text-decoration:none}
        .back{opacity:.8}
        .msg{font-size:12px;margin-left:8px;color:#22c55e}
      `}</style>

      <div className="wrap">
        <div className="topnav">
          <div className="title">
            <span style={{ fontSize: 26 }}>⚙️</span>
            <h1 style={{ margin: 0 }}>Thresholds</h1>
          </div>
          <Link className="back" to="/">← Back to Overview</Link>
        </div>

        <div className="card">
          <div className="switch">
            <input
              id="enabled"
              type="checkbox"
              checked={!!cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            />
            <label htmlFor="enabled" style={{ margin: 0 }}>
              Email alerts enabled (we’ll wire the sender later)
            </label>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Cooldown (minutes)</label>
              <input
                type="number"
                min={1}
                value={cfg.cooldown_min ?? 15}
                onChange={(e) =>
                  setCfg({ ...cfg, cooldown_min: Number(e.target.value) })
                }
              />
              <div className="meta">
                Minimum gap between repeated alerts for the same breach.
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Node 1 — Limits
          </div>
          <div className="grid">
            <div>
              <label>CO₂ (ppm) — min</label>
              <input
                type="number"
                value={n1.co2_ppm?.min ?? ""}
                onChange={(e) =>
                  setNodeRange("co2_ppm", "min", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label>CO₂ (ppm) — max</label>
              <input
                type="number"
                value={n1.co2_ppm?.max ?? ""}
                onChange={(e) =>
                  setNodeRange("co2_ppm", "max", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>

            <div>
              <label>Temp (°C) — min</label>
              <input
                type="number"
                value={n1.t_c?.min ?? ""}
                onChange={(e) =>
                  setNodeRange("t_c", "min", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label>Temp (°C) — max</label>
              <input
                type="number"
                value={n1.t_c?.max ?? ""}
                onChange={(e) =>
                  setNodeRange("t_c", "max", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>

            <div>
              <label>RH (%) — min</label>
              <input
                type="number"
                value={n1.rh_pct?.min ?? ""}
                onChange={(e) =>
                  setNodeRange("rh_pct", "min", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label>RH (%) — max</label>
              <input
                type="number"
                value={n1.rh_pct?.max ?? ""}
                onChange={(e) =>
                  setNodeRange("rh_pct", "max", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>

            <div>
              <label>Lux — min</label>
              <input
                type="number"
                value={n1.light_lux?.min ?? ""}
                onChange={(e) =>
                  setNodeRange("light_lux", "min", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label>Battery — min</label>
              <input
                type="number"
                value={n1.batt?.min ?? ""}
                onChange={(e) =>
                  setNodeRange("batt", "min", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="btns">
            <button className="btn save" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save thresholds"}
            </button>
            {msg && <span className="msg">{msg}</span>}
          </div>
        </div>

        <div className="meta">
          Tip: Node 2 and 3 can be added the same way later
          (we’ll extend this form when those nodes are live).
        </div>
      </div>
    </>
  );
}
