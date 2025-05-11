import { FC, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import styles from "./LoginCallback.module.scss";
import { useStore } from "../hooks/useStore";
import { Loader } from "./ui/Loader";
import { AuthenticationError, authService } from "../api";

export const LoginCallback: FC = () => {
  const { handleCodeExchange, store } = useStore();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const MAX_RETRY_ATTEMPTS = 3;

  const processLoginCallback = useCallback(
    async (code: string) => {
      try {
        setIsRetrying(true);
        // Exchange the code for tokens
        const success = await handleCodeExchange(code);
        if (success) {
          navigate("/posts");
        } else {
          setError(store.auth.error || "Failed to authenticate with Reddit");
          setIsRetrying(false);
        }
      } catch (err) {
        const errorMessage =
          err instanceof AuthenticationError
            ? err.message
            : "An unexpected error occurred";
        console.error("Authentication error:", err);
        setError(errorMessage);
        setIsRetrying(false);
      }
    },
    [handleCodeExchange, navigate, store.auth.error]
  );

  // Handler for retry button
  const handleRetry = () => {
    const query = new URLSearchParams(search);
    const code = query.get("code");

    if (code && attempts < MAX_RETRY_ATTEMPTS) {
      setAttempts((prev) => prev + 1);
      setError(null);
      processLoginCallback(code);
    } else if (attempts >= MAX_RETRY_ATTEMPTS) {
      setError("Maximum retry attempts reached. Please try logging in again.");
    }
  };

  // Handler for login again button
  const handleLoginAgain = () => {
    const loginUrl = authService.getLoginUrl();
    window.location.href = loginUrl;
  };
  useEffect(() => {
    const initAuthentication = async () => {
      const query = new URLSearchParams(search);
      const code = query.get("code");
      const error = query.get("error");

      // Handle error from Reddit OAuth
      if (error) {
        setError(`Authentication error from Reddit: ${error}`);
        return;
      }

      // No code found in URL
      if (!code) {
        setError(
          "Authorization code is missing from the URL. Please try logging in again."
        );
        return;
      }

      // Process the authorization code
      await processLoginCallback(code);
    };

    if (!isRetrying) {
      initAuthentication();
    }
  }, [
    search,
    handleCodeExchange,
    navigate,
    store.auth.error,
    isRetrying,
    processLoginCallback,
  ]);

  // If we're still loading or retrying, show the loader
  if ((store.auth.isLoading || isRetrying) && !error) {
    return (
      <div className={styles.container}>
        <Loader isVisible={true} />
        <p className={styles.loadingMessage}>
          {isRetrying
            ? `Authenticating attempt ${
                attempts + 1
              } of ${MAX_RETRY_ATTEMPTS}...`
            : "Authenticating with Reddit..."}
        </p>
      </div>
    );
  }

  // If there's an error, show an error message with retry option
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Authentication Failed</h2>
          <p className={styles.errorMessage}>{error}</p>

          <div className={styles.buttonContainer}>
            {attempts < MAX_RETRY_ATTEMPTS &&
              error.includes("Failed to fetch") && (
                <button onClick={handleRetry} className={styles.retryButton}>
                  Retry Authentication
                </button>
              )}

            <button onClick={handleLoginAgain} className={styles.loginButton}>
              Log In Again
            </button>

            <button onClick={() => navigate("/")} className={styles.homeButton}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback while redirecting
  return (
    <div className={styles.container}>
      <Loader isVisible={true} />
      <p className={styles.loadingMessage}>Redirecting to saved posts...</p>
    </div>
  );
};
