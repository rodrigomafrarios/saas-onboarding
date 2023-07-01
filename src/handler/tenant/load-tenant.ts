import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger } from "@utils";
import { ScopeEnum } from "@type";
import { PathParameters, pathParams, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Role, Tenant, User } from "@entity";

/**
 * 
 * @param event.pathParameters.id: string
 * 
 * @description It loads an tenant by id
 * 
 * @returns 
 *  HTTP 200 - OK
 *  HTTP 400 - Bad Request
 *  HTTP 403 - Forbidden
 *  HTTP 404 - Not Found
 */
export const loadTenantHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const validation = schemaValidator<PathParameters>(pathParams, { ...event.pathParameters });
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { id } = validation;
  const { tenantId, userId } = getRequestContextClaim(event.requestContext);
  const user = await User.getById(tenantId, userId);
  if (!user) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }

  const role = await Role.getById(
    tenantId,
    user.roleId
  );
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

  const tenant = await Tenant.getById(id);
  if (!tenant) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Tenant not found"
    });
  }

  logger.info("Loading tenant.");

  return formatJsonResponse({
    statusCode: 200,
    body: tenant
  });
};