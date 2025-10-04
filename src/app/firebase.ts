// src/app/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ---- Try to read from Vite env (optional) ----
const cfgFromEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
    | string
    | undefined,
};

// ---- Known-good fallbacks (your project) ----
const cfgFallback = {
  apiKey: "AIzaSyCuWq4bpRt583au5mFV_e40nuJ39tCwueY",
  authDomain: "jouleless-gateway-v0.firebaseapp.com",
  databaseURL:
    "https://jouleless-gateway-v0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jouleless-gateway-v0",
  storageBucket: "jouleless-gateway-v0.firebasestorage.app",
  messagingSenderId: "554577786746",
  appId: "1:554577786746:web:c8325c603143aefe8b88c3",
  measurementId: "G-XCKLPZEB8C",
};

// Keep only defined, non-empty env values so we don't overwrite fallbacks with `undefined`
const envOnly: Record<string, string> = {};
for (const [k, v] of Object.entries(cfgFromEnv)) {
  if (typeof v === "string" && v.trim().length > 0) {
    envOnly[k] = v;
  }
}
if (Object.keys(envOnly).length === 0) {
  console.warn(
    "[Fragaria] No .env values found — using embedded Firebase config (fallback)."
  );
}

const firebaseConfig = { ...cfgFallback, ...envOnly };

// Reuse app if HMR reloaded
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

/** Resolves when we’re signed in anonymously. */
export function authReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub();
          resolve();
        }
      },
      (err) => {
        unsub();
        reject(err);
      }
    );
    // Trigger anon sign-in (no-op if already signed in)
    signInAnonymously(auth).catch(() => {
      /* already signed in — ignore */
    });
  });
}

export default app;
