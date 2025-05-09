import { Request, Response } from "express";
import fetch from "node-fetch";
import { formatErrorResponse } from "../utils/responses.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// Handle token exchange from authorization code
export async function exchangeToken(req: Request, res: Response) {
  try {
    const { code, redirectUri } = req.body;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    if (!code || !redirectUri) {
      logError("Missing parameters in token exchange request", null, {
        body: req.body,
        missingCode: !code,
        missingRedirectUri: !redirectUri,
      });

      return res
        .status(400)
        .json(
          formatErrorResponse(
            400,
            "Missing required parameters. Both code and redirectUri are required."
          )
        );
    }

    if (!clientId || !clientSecret) {
      logError(
        "Missing server environment variables for Reddit API credentials",
        null,
        {
          missingClientId: !clientId,
          missingClientSecret: !clientSecret,
        }
      );

      return res
        .status(500)
        .json(
          formatErrorResponse(
            500,
            "Server configuration error: Missing API credentials"
          )
        );
    }

    logInfo(`Attempting token exchange with Reddit`, {
      redirectUri,
      hasCode: !!code,
    });

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
      logError("Token exchange failed with Reddit API", null, {
        status: response.status,
        errorText,
      });

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
    logInfo("Token exchange successful", {
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope,
    });

    return res.json(data);
  } catch (error) {
    logError("Error during token exchange", error);

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
    const { refreshToken } = req.body;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    if (!refreshToken) {
      logError("Missing refresh token in request", null, { body: req.body });

      return res
        .status(400)
        .json(formatErrorResponse(400, "Missing refresh token"));
    }

    if (!clientId || !clientSecret) {
      logError("Missing server environment variables for token refresh", null, {
        missingClientId: !clientId,
        missingClientSecret: !clientSecret,
      });

      return res
        .status(500)
        .json(
          formatErrorResponse(
            500,
            "Server configuration error: Missing API credentials"
          )
        );
    }

    logInfo("Attempting to refresh Reddit API token");

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
      logError("Token refresh failed with Reddit API", null, {
        status: response.status,
        errorText,
      });

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
    logInfo("Token refresh successful", {
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    });

    // Reddit doesn't return refresh_token on refresh requests, so add it back
    return res.json({
      ...data,
      refresh_token: refreshToken,
    });
  } catch (error) {
    logError("Error during token refresh", error);

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
