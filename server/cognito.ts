import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  type AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "eu-central-1",
});

const clientId = process.env.COGNITO_CLIENT_ID;
const userPoolId = process.env.COGNITO_USER_POOL_ID;

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

export async function cognitoRegister(email: string, password: string): Promise<{ userSub: string; userConfirmed: boolean }> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const command = new SignUpCommand({
    ClientId: clientId,
    Username: email.toLowerCase().trim(),
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email.toLowerCase().trim() },
    ],
  });

  const response = await client.send(command);
  
  return {
    userSub: response.UserSub || "",
    userConfirmed: response.UserConfirmed || false,
  };
}

export async function cognitoConfirmSignUp(email: string, code: string): Promise<void> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: email.toLowerCase().trim(),
    ConfirmationCode: code,
  });

  await client.send(command);
}

export async function cognitoLogin(email: string, password: string): Promise<CognitoTokens> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH" as AuthFlowType,
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email.toLowerCase().trim(),
      PASSWORD: password,
    },
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

export async function cognitoRefreshToken(refreshToken: string): Promise<CognitoTokens> {
  if (!clientId) throw new Error("COGNITO_CLIENT_ID not configured");

  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH" as AuthFlowType,
    ClientId: clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
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
