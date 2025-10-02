// src/app/rtdb.ts
import { db } from "./firebase";
import { ref, get, onValue } from "firebase/database";

export type Snap = {
  node_id: number;
  co2_ppm: number;
  t_c: number;
  rh_pct: number;
  light_lux?: number | null;
  batt?: number;
  flags?: number;
  t_utc: number; // epoch seconds (UTC)
  gateway_id: string;
  ver: number;
};

export async function getLatestOnce(gatewayId: string) {
  const snap = await get(ref(db, `latest/${gatewayId}`));
  return (snap.val() ?? null) as Record<string, any> | null;
}

export function listenLatest(
  gatewayId: string,
  cb: (data: Record<string, any> | null) => void
) {
  const r = ref(db, `latest/${gatewayId}`);
  return onValue(r, (snap) => cb((snap.val() ?? null) as Record<string, any> | null));
}

// Gateway writes day buckets in UTC. Use today's UTC path.
function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Live listener for today's readings, filtered to one node, newest first.
export function listenDayReadingsForNode(
  gatewayId: string,
  nodeId: number,
  cb: (rows: Snap[]) => void
) {
  const ymd = todayUTC();
  const r = ref(db, `readings/${gatewayId}/${ymd}`);
  return onValue(r, (snap) => {
    const v = (snap.val() ?? {}) as Record<string, Snap>;
    const rows: Snap[] = [];
    for (const [k, val] of Object.entries(v)) {
      if (k.endsWith(`_${nodeId}`)) rows.push(val);
    }
    rows.sort((a, b) => (b.t_utc || 0) - (a.t_utc || 0)); // newest first
    cb(rows);
  });
}
