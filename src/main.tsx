import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installWriteInvalidation } from "./lib/purchases-cache";

installWriteInvalidation();

createRoot(document.getElementById("root")!).render(<App />);
