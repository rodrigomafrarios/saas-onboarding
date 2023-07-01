import { v4 as uuid } from "uuid";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { emailSender, getRequestContextClaim, logger } from "@utils";
import { schemaValidator, sendInvitationBodySchema, SendInvitationBodySchema } from "@schema";
import { ArgumentError } from "@errors";
import { Invitation, Role, Tenant, User } from "@entity";
import Config from "@config";

import { formatJsonResponse } from "../../utils/format-response";
import { InvitationStatusEnum, ScopeEnum, SendInvitationHttpResponseBody } from "../../type";

/**
 * 
 * @param event.body
 *  @field invitee: string
 * 
 * @description It sends an invitation to participate on the tenant's venue
 * 
 * @returns 
 *  HTTP 200 - OK
 *  HTTP 400 - Bad Request
 *  HTTP 403 - Forbidden
 *  HTTP 404 - Not Found
 */
export const sendInvitationHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const validation = schemaValidator<SendInvitationBodySchema>(sendInvitationBodySchema, event.body as string);
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { tenantId, userId } = getRequestContextClaim(event.requestContext);
  const requesterUser = await User.getById(tenantId, userId);
  if (!requesterUser) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }

  const role = await Role.getById(requesterUser.tenantId, requesterUser.roleId);
  if (!role) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Role not found"
    });
  }

  const requestUserAdmin = role.scope === ScopeEnum.ADMIN;
  if (!requestUserAdmin) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  const { invitee } = validation;

  const user = await User.getByEmail(invitee);
  const userAlreadyExists = user && user.tenantId === requesterUser.tenantId;
  if (userAlreadyExists) {
    return formatJsonResponse({
      statusCode: 400,
      body: "User already exists"
    });
  }

  logger.info("Data validated.");

  const invitation = await Invitation.getByEmail(invitee);
  const invitationAlreadyExists = invitation && invitation.tenantId === requesterUser.tenantId;
  if (invitationAlreadyExists) {
    logger.info("Invitation already exists.");
    await invitation.delete();
  }

  const secret = nanoid(5);
  const hash = await bcrypt.hash(secret, 10);
  const now = new Date();
  const expiresAt = dayjs(now).add(1, "day").toISOString();

  const newInvitation = new Invitation(
    uuid(),
    requesterUser.tenantId,
    invitee,
    secret,
    InvitationStatusEnum.SENT,
    false,
    now.toISOString(),
    expiresAt
  );

  const link = `https://${Config.onboardingDomain}/signup?invitee=${invitee}&hash=${hash}`;
  const tenant = await Tenant.getById(requesterUser.tenantId);

  if (tenant) {
    await Promise.all([
      newInvitation.put(),
      emailSender({
        subject: `Invitation for ${tenant.name}.`,
        message: `You've been invited to participate on ${tenant.name}. Please, click on the link ${link} and complete your sign-up proccess`,
        to: [invitee]
      })
    ]);

    logger.info("Invitation was sent.");
  }

  return formatJsonResponse<SendInvitationHttpResponseBody>({
    statusCode: 200,
    body: {
      sent: true
    }
  });
};