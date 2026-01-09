import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  type AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import { randomUUID } from "crypto";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "eu-central-1",
});

const clientId = process.env.COGNITO_CLIENT_ID;
const clientSecret = process.env.COGNITO_CLIENT_SECRET;
const userPoolId = process.env.COGNITO_USER_POOL_ID;

function computeSecretHash(username: string): string | undefined {
  if (!clientSecret || !clientId) return undefined;
  const hmac = crypto.createHmac("sha256", clientSecret);
  hmac.update(username + clientId);
  return hmac.digest("base64");
}

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface CognitoUser {
  sub: string;
  email: string;
  emailVerified: boolean;
}

export async function cognitoRegister(email: string, password: string): Promise<{ userSub: string; userConfirmed: boolean; username: string }> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const normalizedEmail = email.toLowerCase().trim();
  // Use UUID as username since pool is configured with email as alias
  const username = randomUUID();
  const secretHash = computeSecretHash(username);

  const command = new SignUpCommand({
    ClientId: clientId,
    Username: username,
    Password: password,
    SecretHash: secretHash,
    UserAttributes: [
      { Name: "email", Value: normalizedEmail },
    ],
  });

  const response = await client.send(command);
  
  return {
    userSub: response.UserSub || "",
    userConfirmed: response.UserConfirmed || false,
    username: username, // Return username for confirmation
  };
}

export async function cognitoConfirmSignUp(username: string, code: string): Promise<void> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const secretHash = computeSecretHash(username);

  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: username,
    ConfirmationCode: code,
    SecretHash: secretHash,
  });

  await client.send(command);
}

export async function cognitoLogin(email: string, password: string): Promise<CognitoTokens> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const username = email.toLowerCase().trim();
  const secretHash = computeSecretHash(username);

  const authParams: Record<string, string> = {
    USERNAME: username,
    PASSWORD: password,
  };
  if (secretHash) {
    authParams.SECRET_HASH = secretHash;
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH" as AuthFlowType,
    ClientId: clientId,
    AuthParameters: authParams,
  });

  const response = await client.send(command);
  
  if (!response.AuthenticationResult) {
    throw new Error("Authentication failed - no result returned");
  }

  return {
    idToken: response.AuthenticationResult.IdToken || "",
    accessToken: response.AuthenticationResult.AccessToken || "",
    refreshToken: response.AuthenticationResult.RefreshToken,
    expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
  };
}

export async function cognitoRefreshToken(refreshToken: string, username?: string): Promise<CognitoTokens> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const authParams: Record<string, string> = {
    REFRESH_TOKEN: refreshToken,
  };
  if (clientSecret && username) {
    const secretHash = computeSecretHash(username);
    if (secretHash) {
      authParams.SECRET_HASH = secretHash;
    }
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH" as AuthFlowType,
    ClientId: clientId,
    AuthParameters: authParams,
  });

  const response = await client.send(command);
  
  if (!response.AuthenticationResult) {
    throw new Error("Token refresh failed");
  }

  return {
    idToken: response.AuthenticationResult.IdToken || "",
    accessToken: response.AuthenticationResult.AccessToken || "",
    expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
  };
}

export async function cognitoGetUser(accessToken: string): Promise<CognitoUser> {
  const command = new GetUserCommand({
    AccessToken: accessToken,
  });

  const response = await client.send(command);
  
  const email = response.UserAttributes?.find(attr => attr.Name === "email")?.Value || "";
  const emailVerified = response.UserAttributes?.find(attr => attr.Name === "email_verified")?.Value === "true";
  const sub = response.UserAttributes?.find(attr => attr.Name === "sub")?.Value || response.Username || "";

  return { sub, email, emailVerified };
}

export async function cognitoGlobalSignOut(accessToken: string): Promise<void> {
  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  await client.send(command);
}

export function getCognitoConfig() {
  return {
    region: process.env.AWS_REGION || "eu-central-1",
    userPoolId,
    clientId,
    configured: !!(clientId && userPoolId),
  };
}
