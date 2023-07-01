import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { emailSender, formatJsonResponse, logger } from "@utils";
import { forgotPasswordBodySchema, ForgotPasswordBodySchema, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Tenant, User } from "@entity";
import Config from "@config";

/**
 * 
 * @param event.body 
 * @field email: string 
 * 
 * @description It sends an e-mail confirmation to reset password.
 * 
 * @returns 
 * HTTP 204 - No Content
 * HTTP 400 - Bad Request
 * HTTP 404 - Not Found
 */
export const forgotPasswordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const validation = schemaValidator<ForgotPasswordBodySchema>(forgotPasswordBodySchema, event.body as string);
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { email } = validation;
  const user = await User.getByEmail(email);
  if (!user) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }

  const tenant = await Tenant.getById(user.tenantId);
  const token = jwt.sign({
    expiresAt: dayjs().add(5, "hours").toISOString(),
    subDomain: tenant?.subDomain,
    email: user.email
  }, Config.jwtSecret);

  const link = `https://${Config.onboardingDomain}/reset-password?hash=${token}`;

  await Promise.all([
    user.update({
      resetPassword: true
    }),
    emailSender({
      subject: "Reset your password.",
      message: `Please, click on the link ${link} and reset your password`,
      to: [email]
    })
  ]);

  logger.info("The reset password e-mail was sent.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};