import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import {
  setAuthTokenGetter,
  setBaseUrl,
} from "./lib/api-client";

setBaseUrl(import.meta.env.VITE_API_URL || "http://localhost:3000");

setAuthTokenGetter(() =>
  localStorage.getItem("appAccessToken")
);

createRoot(document.getElementById("root")!).render(
  <App />
);