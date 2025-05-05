import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.scss";
import { BrowserRouter } from "react-router-dom";

// Register and handle service worker updates
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );

        // Check for updates when the page loads
        registration.update();

        // Check for updates periodically
        setInterval(() => {
          registration.update();
          console.log("Checking for service worker updates...");
        }, 60 * 60 * 1000); // Check every hour

        // Handle updates when found
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("New service worker being installed");

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New version available
                console.log("New version available! Reloading...");

                // For a better UX, you might want to show a notification instead
                // of automatically refreshing
                if (
                  window.confirm(
                    "A new version of the app is available. Reload to update?"
                  )
                ) {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                }
              }
            });
          }
        });

        // Handle controller change (when skipWaiting() is called)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("New service worker activated, reloading page");
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  //<React.StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  //</React.StrictMode>
);
