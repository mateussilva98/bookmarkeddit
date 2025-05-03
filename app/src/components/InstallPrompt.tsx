import { FC, useEffect, useState } from "react";
import styles from "./InstallPrompt.module.scss";
import { X } from "./icons/X";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt: FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const isIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    };

    setIsIOS(isIOSDevice());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show our custom prompt banner
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;

    // Show the browser install prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
      // Clear the saved prompt as it can't be used again
      setInstallPrompt(null);
      setShowPrompt(false);
    });
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save to localStorage to prevent showing again for a while
    localStorage.setItem("installPromptDismissed", Date.now().toString());
  };

  // Check if we should show the prompt based on previous dismissals
  useEffect(() => {
    const lastDismissed = localStorage.getItem("installPromptDismissed");
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      const dayInMs = 24 * 60 * 60 * 1000;
      // Only show again after 7 days
      if (Date.now() - dismissedTime < 7 * dayInMs) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptContent}>
        <div className={styles.promptText}>
          {isIOS ? (
            <>
              <strong>Install this app on your iPhone:</strong> tap{" "}
              <span className={styles.icon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                  <line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
              </span>{" "}
              and then "Add to Home Screen"
            </>
          ) : (
            <>
              <strong>Add to Home Screen</strong> for a better experience
            </>
          )}
        </div>

        {!isIOS && (
          <button className={styles.installButton} onClick={handleInstallClick}>
            Install
          </button>
        )}

        <button className={styles.dismissButton} onClick={handleDismiss}>
          <X />
        </button>
      </div>
    </div>
  );
};
