import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";

const region = process.env.AWS_REGION || "eu-central-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID not configured");
  }
  
  if (!jwks) {
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  
  return jwks;
}

export interface CognitoJWTPayload extends JWTPayload {
  sub: string;
  email?: string;
  "cognito:username"?: string;
  token_use?: "id" | "access";
}

export interface AuthenticatedRequest extends Request {
  cognitoUser?: {
    userId: string;
    email: string;
    tenantId: string;
  };
}

export async function verifyIdToken(idToken: string): Promise<CognitoJWTPayload> {
  if (!userPoolId || !clientId) {
    throw new Error("Cognito not configured");
  }

  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  
  try {
    const { payload } = await jwtVerify(idToken, getJWKS(), {
      issuer: expectedIssuer,
      audience: clientId,
    });

    const cognitoPayload = payload as CognitoJWTPayload;
    
    if (cognitoPayload.token_use && cognitoPayload.token_use !== "id") {
      throw new Error("Invalid token_use: expected id token");
    }

    return cognitoPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw error;
  }
}

export async function verifyAccessToken(accessToken: string): Promise<CognitoJWTPayload> {
  if (!userPoolId) {
    throw new Error("Cognito not configured");
  }

  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  
  try {
    const { payload } = await jwtVerify(accessToken, getJWKS(), {
      issuer: expectedIssuer,
    });

    const cognitoPayload = payload as CognitoJWTPayload;
    
    if (cognitoPayload.token_use && cognitoPayload.token_use !== "access") {
      throw new Error("Invalid token_use: expected access token");
    }

    return cognitoPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw error;
  }
}

export function cognitoAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ message: "No authentication token provided" });
  }

  verifyIdToken(token)
    .then((payload) => {
      req.cognitoUser = {
        userId: payload.sub,
        email: payload.email || payload["cognito:username"] || "",
        tenantId: payload.sub,
      };
      next();
    })
    .catch((error) => {
      console.error("Auth error:", error.message);
      res.status(401).json({ message: "Invalid or expired token" });
    });
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  const cookieToken = req.cookies?.lucidoc_token;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}
