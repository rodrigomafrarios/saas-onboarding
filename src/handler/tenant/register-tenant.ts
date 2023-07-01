import { v4 as uuid } from "uuid";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { emailSender, formatJsonResponse, logger } from "@utils";
import { InvitationStatusEnum, ScopeEnum } from "@type";
import { registerTenantBodySchema, RegisterTenantBodySchema, schemaValidator } from "@schema";
import { AlreadyInUseError, ArgumentError } from "@errors";
import { Invitation, Role, Tenant, User } from "@entity";
import Config from "@config";

/**
 * 
 * @param event.body
 *  @field adminEmail: string
 *  @field subDomain: string
 *  @field name: string
 *  @field tier: string
 * 
 * @description It creates an tenant and it sends an e-mail verification for the admin
 * 
 * @returns 
 *  HTTP 400 - Bad Request
 *  HTTP 201 - Created
 */
export const registerTenantHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const validation = schemaValidator<RegisterTenantBodySchema>(registerTenantBodySchema, event.body as string);
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({ statusCode: 400, body: validation.message });
  }

  const tenant = await Tenant.getBySubDomain(validation.subDomain);
  if (tenant) {
    const { message } = new AlreadyInUseError("Subdomain");
    return formatJsonResponse({ statusCode: 400, body: message });
  }
  
  // TODO: should we avoid e-mail duplication?
  const user = await User.getByEmail(validation.adminEmail);
  if (user) {
    const { message } = new AlreadyInUseError("E-mail");
    return formatJsonResponse({ statusCode: 400, body: message });
  }

  logger.info("Data validated.");

  const now = new Date();
  const newTenant = new Tenant(
    uuid(),
    validation.adminEmail,
    validation.subDomain,
    validation.name,
    validation.tier,
    now.toISOString()
  );

  await newTenant.put();
  
  const roleOperations = [
    new Role(
      uuid(),
      newTenant.id,
      "ADMIN_ROLE",
      ScopeEnum.ADMIN
    ).put(),
    new Role(
      uuid(),
      newTenant.id,
      "MEMBER_ROLE",
      ScopeEnum.MEMBER
    ).put()
  ];

  await Promise.all(roleOperations);

  const secret = nanoid(5);
  const hash = await bcrypt.hash(secret, 10);

  const expiresAt = dayjs(now).add(1, "day").toISOString();

  const invitation = new Invitation(
    uuid(),
    newTenant.id,
    newTenant.adminEmail,
    secret,
    InvitationStatusEnum.SENT,
    true,
    now.toISOString(),
    expiresAt
  );

  await invitation.put();  

  const link = `https://${Config.onboardingDomain}/signup?invitee=${newTenant.adminEmail}&hash=${hash}`;

  await emailSender({
    subject: `Invitation for ${newTenant.name}.`,
    message: `You've been invited to participate on ${newTenant.name}. Please click on the link ${link} and complete your sign-up proccess`,
    to: [newTenant.adminEmail]
  });

  logger.info("Tenant was registered.");
  
  return formatJsonResponse({
    statusCode: 201,
    body: null
  });
};