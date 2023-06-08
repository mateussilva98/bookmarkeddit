import { FC, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import styles from "./LoginCallback.module.scss";
import { Buffer } from "buffer";
import { useStore } from "../hooks/use-store";

export const LoginCallback: FC = () => {
  const { setAccessToken, setRefreshToken } = useStore();
  const navigate = useNavigate();
  let { search } = useLocation();

  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const query = new URLSearchParams(search);
        const code = query.get("code");
        const clientId = import.meta.env.VITE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_CLIENT_SECRET;
        const redirectURI = window.location.origin + "/login/callback";

        const encodedHeader = Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64");

        let response = await fetch(
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

        let body = await response.json();
        const accessToken = body["access_token"];
        const refreshToken = body["refresh_token"];
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        navigate("/posts");
      } catch (error) {
        console.log(error);
        navigate("/");
      }
    };

    getAccessToken();
  });
  return (
    <div className={styles.root}>
      <div className={styles.loader}>
        <div className={styles["loader-wheel"]}></div>
        <div className={styles["loader-text"]}></div>
      </div>
    </div>
  );
};
