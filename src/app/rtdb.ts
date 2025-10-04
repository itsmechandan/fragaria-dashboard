// src/app/rtdb.ts
import { db } from "./firebase";
import { ref, onValue, get } from "firebase/database";

// ---- Types we use inside this module ----
type HistoryRow = {
  node_id: number;
  t_utc: number;
  co2_ppm?: number;
  t_c?: number;
  rh_pct?: number;
  light_lux?: number | null;
  batt?: number;
};

// ---- Helpers ----
function addDaysISO(startISO: string, days: number): string {
  const d = new Date(startISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---- Live latest snapshots (/latest/GWID) ----
export function listenLatest(
  gatewayId: string,
  cb: (map: Record<string, HistoryRow>) => void
) {
  const r = ref(db, `latest/${gatewayId}`);
  return onValue(r, (snap) => cb((snap.val() as any) ?? {}));
}

// ---- Per-day averages by node (from /readings/GWID/YYYY-MM-DD) ----
export function listenDayAverages(
  gatewayId: string,
  yyyy_mm_dd: string,
  cb: (byNode: Record<
    string,
    { count: number; co2_ppm?: number; t_c?: number; rh_pct?: number; light_lux?: number; batt?: number }
  >) => void
) {
  const r = ref(db, `readings/${gatewayId}/${yyyy_mm_dd}`);
  return onValue(r, (snap) => {
    const sums: Record<
      string,
      { count: number; co2_ppm?: number; t_c?: number; rh_pct?: number; light_lux?: number; batt?: number }
    > = {};

    snap.forEach((c) => {
      const v = c.val() as HistoryRow;
      const id = String(v.node_id);
      const s = (sums[id] ||= { count: 0 });
      s.count++;
      if (typeof v.co2_ppm === "number") s.co2_ppm = (s.co2_ppm ?? 0) + v.co2_ppm;
      if (typeof v.t_c === "number") s.t_c = (s.t_c ?? 0) + v.t_c;
      if (typeof v.rh_pct === "number") s.rh_pct = (s.rh_pct ?? 0) + v.rh_pct;
      if (typeof v.light_lux === "number") s.light_lux = (s.light_lux ?? 0) + v.light_lux;
      if (typeof v.batt === "number") s.batt = (s.batt ?? 0) + v.batt;
    });

    const avg: Record<
      string,
      { count: number; co2_ppm?: number; t_c?: number; rh_pct?: number; light_lux?: number; batt?: number }
    > = {};
    for (const id of Object.keys(sums)) {
      const s = sums[id];
      const c = Math.max(1, s.count);
      avg[id] = {
        count: s.count,
        co2_ppm: s.co2_ppm !== undefined ? s.co2_ppm / c : undefined,
        t_c: s.t_c !== undefined ? s.t_c / c : undefined,
        rh_pct: s.rh_pct !== undefined ? s.rh_pct / c : undefined,
        light_lux: s.light_lux !== undefined ? s.light_lux / c : undefined,
        batt: s.batt !== undefined ? s.batt / c : undefined,
      };
    }
    cb(avg);
  });
}

// ---- Multi-day daily series for a metric (fills missing days with 0) ----
export async function getDailySeries(
  gatewayId: string,
  nodeId: string | number,
  metric: "co2_ppm" | "t_c" | "rh_pct" | "light_lux" | "batt",
  maxDays = 30
): Promise<Array<{ date: string; value: number }>> {
  const root = await get(ref(db, `readings/${gatewayId}`));
  if (!root.exists()) return [];

  const allDates: string[] = [];
  root.forEach((c) => {
  const k = c.key;        // k: string | null
  if (k) allDates.push(k);
   // only push when it's a real string
});
  allDates.sort();
  const dates = allDates.slice(-maxDays);
  if (!dates.length) return [];

  const first = dates[0];
  const last = dates[dates.length - 1];

  // build full continuous day range
  const full: string[] = [];
  let cur = first;
  while (cur <= last) {
    full.push(cur);
    cur = addDaysISO(cur, 1);
  }
  const have = new Set(dates);

  const out: Array<{ date: string; value: number }> = [];
  for (const d of full) {
    if (!have.has(d)) {
      out.push({ date: d, value: 0 });
      continue;
    }
    const daySnap = await get(ref(db, `readings/${gatewayId}/${d}`));
    let sum = 0;
    let n = 0;
    daySnap.forEach((row) => {
      const v = row.val() as HistoryRow;
      if (String(v.node_id) !== String(nodeId)) return;
      const m = v[metric as keyof HistoryRow] as number | null | undefined;
      if (typeof m === "number") {
        sum += m;
        n++;
      }
    });
    out.push({ date: d, value: n ? sum / n : 0 });
  }
  return out;
}

// ---- Per-node history for a specific day (sorted by time) ----
export async function getNodeDayHistory(
  gatewayId: string,
  nodeId: string | number,
  yyyy_mm_dd: string
): Promise<HistoryRow[]> {
  const snap = await get(ref(db, `readings/${gatewayId}/${yyyy_mm_dd}`));
  if (!snap.exists()) return [];
  const rows: HistoryRow[] = [];
  snap.forEach((c) => {
    const v = c.val() as HistoryRow;
    if (String(v.node_id) === String(nodeId)) rows.push(v);
  });
  rows.sort((a, b) => a.t_utc - b.t_utc);
  return rows;
}
