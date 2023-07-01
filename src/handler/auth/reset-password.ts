import jwt from "jsonwebtoken";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, logger } from "@utils";
import { CognitoJwtPayload } from "@type";
import { resetPasswordBodySchema, ResetPasswordBodySchema, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Tenant, User } from "@entity";
import { cognito } from "@core/aws-client";
import Config from "@config";

/**
 * 
 * @param event.body 
 * @field newPassword: string
 * @field hash: string 
 * 
 * @description It resets user's password.
 * 
 * @returns 
 * HTTP 204 - No Content
 * HTTP 400 - Bad Request
 * HTTP 403 - Forbidden
 * HTTP 404 - Not Found
 */
export const resetPasswordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const validation = schemaValidator<ResetPasswordBodySchema>(resetPasswordBodySchema, event.body as string);
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { hash, newPassword } = validation;
  const verified = jwt.verify(hash, Config.jwtSecret, { complete: true });

  if (typeof verified.payload === "string") {
    logger.error("Jwt not verified");
    throw new ArgumentError();
  }

  const { expiresAt, subDomain, email } = verified.payload as CognitoJwtPayload;

  const expired =
    expiresAt
    && new Date(expiresAt).getTime() < new Date().getTime();
  
  if (expired) {
    return formatJsonResponse({
      statusCode: 400,
      body: "Hash has expired."
    });
  }

  const tenant = await Tenant.getBySubDomain(subDomain);
  if (!tenant) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Tenant not found."
    });
  }

  const user = await User.getByEmail(email);
  if (!user) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found."
    });
  }

  const userBelongsToTenant = user.tenantId === tenant.id;
  if (!userBelongsToTenant || user.resetPassword === false) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  await Promise.all([
    user.update({
      resetPassword: false
    }),
    cognito.adminSetUserPassword({
      UserPoolId: process.env.USERPOOL as string,
      Username: user.email,
      Password: newPassword,
      Permanent: true
    }).promise()
  ]);

  logger.info("The password has been reset.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};