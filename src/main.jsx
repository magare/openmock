import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./editor-enhancements.css";

document.documentElement.style.setProperty(
  "--placeholder-texture",
  `url("${import.meta.env.BASE_URL}assets/source/placeholder.jpg")`,
);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
