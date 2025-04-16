import { FC, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import styles from "./LoginCallback.module.scss";
import { Buffer } from "buffer";
import { useStore } from "../hooks/use-store";

export const LoginCallback: FC = () => {
  const { setAccessToken, setRefreshToken } = useStore();
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const getAccessToken = async () => {
      const query = new URLSearchParams(search);
      const code = query.get("code");

      if (!code) {
        console.error("Authorization code is missing.");
        navigate("/");
        return;
      }

      try {
        const clientId = import.meta.env.VITE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_CLIENT_SECRET;
        const redirectURI = window.location.origin + "/login/callback";

        const encodedHeader = Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64");

        const response = await fetch(
          "https://www.reddit.com/api/v1/access_token",
          {
            method: "POST",
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectURI}`,
            headers: {
              authorization: `Basic ${encodedHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        if (!response.ok) {
          console.error("Failed to fetch access token:", response.statusText);
          navigate("/");
          return;
        }

        const body = await response.json();
        console.log("Access Token Response:", body);

        const accessToken = body["access_token"];
        const refreshToken = body["refresh_token"];

        if (accessToken && refreshToken) {
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
          navigate("/posts");
        } else {
          console.error("Invalid token response:", body);
          navigate("/");
        }
      } catch (error) {
        console.error("Error during token fetch:", error);
        navigate("/");
      }
    };

    getAccessToken();
  }, [/* search, setAccessToken, setRefreshToken, navigate */]);

  return (
    <div className={styles.root}>
      <div className={styles.loader}>
        <div className={styles["loader-wheel"]}></div>
        <div className={styles["loader-text"]}></div>
      </div>
    </div>
  );
};
