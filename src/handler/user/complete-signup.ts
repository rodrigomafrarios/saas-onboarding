import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, logger } from "@utils";
import { InvitationStatusEnum } from "@type";
import { completeSignupBodySchema, CompleteSignupBodySchema, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Invitation, Role, User } from "@entity";
import { cognito } from "@core/aws-client";

/**
 * 
 * @param event.body
 *  @field hash: string
 *  @field invitee: string
 *  @field user: { givenName: string; familyName: string }
 * 
 * @description It validates invitation, creates user entries on dynamodb and cognito userpool
 * 
 * @returns 
 *  HTTP 400 - Bad Request
 *  HTTP 404 - Not Found
 *  HTTP 204 - No Content
 */
export const completeSignupHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const validation = schemaValidator<CompleteSignupBodySchema>(completeSignupBodySchema, event.body as string);
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const invitation = await Invitation.getByEmail(validation.invitee);
  if (!invitation) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Invitation not found."
    });
  }

  const hashValid = await bcrypt.compare(invitation.hashSecret, validation.hash);
  if (!hashValid) {
    return formatJsonResponse({
      statusCode: 400,
      body: "Hash doesn't match."
    });
  }

  const invitationAlreadyAccepted = invitation.status === InvitationStatusEnum.ACCEPTED;
  if (invitationAlreadyAccepted) {
    return formatJsonResponse({
      statusCode: 400,
      body: "Invitation already accepted."
    });
  }

  const now = new Date();
  const invitationExpired = new Date(invitation.expiresAt).getTime() < now.getTime() || invitation.status === InvitationStatusEnum.EXPIRED;
  if (invitationExpired) {
    await Invitation.updateStatus(invitation.id, InvitationStatusEnum.EXPIRED);

    return formatJsonResponse({
      statusCode: 400,
      body: "Invitation expired."
    });
  }

  logger.info("Data validated.");

  const role = await Role.getByTenantId(invitation.tenantId, invitation.isUserAdmin) as Role;
  
  const user = new User(
    uuid(),
    invitation.tenantId,
    role.id,
    validation.user.givenName,
    validation.user.familyName,
    validation.invitee,
    new Date().toISOString(),
    false
  );

  await Promise.all([
    user.put(),
    cognito.adminCreateUser({
      UserPoolId: process.env.USERPOOL as string,
      Username: user.email,
      UserAttributes: [
        {
          Name: "email",
          Value: user.email,
        },
        {
          Name: "email_verified",
          Value: "true"
        },
        {
          Name: "custom:userId",
          Value: user.id
        },
        {
          Name: "custom:tenantId",
          Value: invitation.tenantId
        },
      ],
    }).promise(),
    Invitation.updateStatus(invitation.id, InvitationStatusEnum.ACCEPTED)
  ]);

  logger.info("User was created.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};