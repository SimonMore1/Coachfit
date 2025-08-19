// === START: src/main.jsx ===
import React from "react";
import ReactDOM from "react-dom/client";

// importa SEMPRE il CSS globale qui (entrypoint)
import "./index.css";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// === END: src/main.jsx ===