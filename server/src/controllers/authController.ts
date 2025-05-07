import { Request, Response } from "express";
import fetch from "node-fetch";
import { formatErrorResponse } from "../utils/responses.js";

// Handle token exchange from authorization code
export async function exchangeToken(req: Request, res: Response) {
  try {
    const { code, redirectUri, clientId, clientSecret } = req.body;

    if (!code || !redirectUri || !clientId || !clientSecret) {
      return res
        .status(400)
        .json(formatErrorResponse(400, "Missing required parameters"));
    }

    console.log(
      `Proxy: Attempting token exchange with redirectURI: ${redirectUri}`
    );

    const encodedCredentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "bookmarkeddit/1.0",
      },
      body: `grant_type=authorization_code&code=${encodeURIComponent(
        code
      )}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Proxy: Token exchange failed:",
        response.status,
        errorText
      );

      return res
        .status(response.status)
        .json(
          formatErrorResponse(
            response.status,
            `Failed to exchange token: ${errorText}`
          )
        );
    }

    const data = (await response.json()) as Record<string, any>;
    console.log("Proxy: Token exchange successful");

    return res.json(data);
  } catch (error) {
    console.error("Proxy: Error during token exchange:", error);

    return res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Error during token exchange: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}

// Handle token refresh
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken, clientId, clientSecret } = req.body;

    if (!refreshToken || !clientId || !clientSecret) {
      return res
        .status(400)
        .json(formatErrorResponse(400, "Missing required parameters"));
    }

    console.log("Proxy: Attempting to refresh token");

    const encodedCredentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "bookmarkeddit/1.0",
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(
        refreshToken
      )}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Proxy: Token refresh failed:", response.status, errorText);

      return res
        .status(response.status)
        .json(
          formatErrorResponse(
            response.status,
            `Failed to refresh token: ${errorText}`
          )
        );
    }

    const data = (await response.json()) as Record<string, any>;
    console.log("Proxy: Token refresh successful");

    // Reddit doesn't return refresh_token on refresh requests, so add it back
    return res.json({
      ...data,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error("Proxy: Error during token refresh:", error);

    return res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Error during token refresh: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}
