// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import NodePage from "./pages/NodePage";
import SettingsPage from "./pages/SettingsPage"; // ← add this

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/node/:nodeId" element={<NodePage />} />
        <Route path="/settings" element={<SettingsPage />} /> {/* ← add */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
