import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-quill/dist/quill.snow.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register PWA service worker (vite-plugin-pwa)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
	import('virtual:pwa-register').then(({ registerSW }) => {
		try {
			registerSW({ immediate: true });
		} catch {}
	}).catch(() => {});
}
