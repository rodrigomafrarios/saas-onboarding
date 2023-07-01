import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger, removeUndefined } from "@utils";
import { ScopeEnum, UpdateTenantParams } from "@type";
import { schemaValidator, updateTenantBodySchema, UpdateTenantBodySchema } from "@schema";
import { ArgumentError } from "@errors";
import { Role, Tenant, User } from "@entity";

/**
 * @param event.body
 * @field name
 * @field tier
 * @field email
 * 
 * @description It updates tenant information.
 * 
 * @returns
 *  HTTP 400 - Bad Request
 *  HTTP 403 - Forbidden
 *  HTTP 404 - Not found
 *  HTTP 204 - No Content
 */

export const updateTenantHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const validation = schemaValidator<UpdateTenantBodySchema>(updateTenantBodySchema, {
    ...JSON.parse(event.body as string),
    ...event.pathParameters
  } as object);
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { id, name, tier, adminEmail } = validation;

  const tenant = await Tenant.getById(id);
  if (!tenant) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Tenant not found"
    });
  }

  const { userId } = getRequestContextClaim(event.requestContext);

  const requestUser = await User.getById(tenant.id, userId);
  if (!requestUser) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }

  const role = await Role.getById(tenant.id, requestUser.roleId);
  if (!role) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Role not found"
    });
  }

  const userAdmin = role.scope === ScopeEnum.ADMIN;

  if (!userAdmin) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  if (adminEmail) {
    const user = await User.getByEmail(adminEmail);
    const userBelongsToTenant = user && user.tenantId === tenant.id;
    if (!userBelongsToTenant) {
      return formatJsonResponse({
        statusCode: 403,
        body: null
      });
    }
  }

  logger.info("Data validated.");

  const params = removeUndefined<UpdateTenantParams>({
    name,
    tier,
    adminEmail
  });

  await tenant.update(params);

  logger.info("Tenant was updated.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};