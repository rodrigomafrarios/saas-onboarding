import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger } from "@utils";
import { ScopeEnum } from "@type";
import { PathParameters, pathParams, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Role, User } from "@entity";

/**
 * 
 * @param event.pathParameters.id string
 * 
 * @description It loads an specific user info.
 * 
 * @returns 
 * HTTP 200 - OK
 * HTTO 400 - Bad Request
 * HTTP 403 - Forbidden
 * HTTP 404 - Not Found
 */
export const loadUserHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const validation = schemaValidator<PathParameters>(pathParams, { ...event.pathParameters});
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { tenantId, userId } = getRequestContextClaim(event.requestContext);
  const requester = await User.getById(tenantId, userId);

  if (!requester) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }

  const role = await Role.getById(requester.tenantId, requester.roleId);
  const requesterAdmin = role?.scope === ScopeEnum.ADMIN;
  if (!requesterAdmin) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  const { id } = validation;

  logger.info({ id }, "Loading user.");
  
  const user = await User.getById(
    tenantId,
    id
  );

  return formatJsonResponse({
    statusCode: 200,
    body: user
  });
};