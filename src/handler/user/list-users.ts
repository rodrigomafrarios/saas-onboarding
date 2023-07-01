import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger } from "@utils";
import { ScopeEnum } from "@type";
import { Role, User } from "@entity";

/**
 * 
 * @description It lists users for specific tenant.
 * 
 * @returns 
 * HTTP 200 - OK
 * HTTP 403 - Forbidden
 * HTTP 404 - Not Found
 */
export const listUsersHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

  logger.info("Listing users.");

  const users = await User.getByTenantId(tenantId);

  return formatJsonResponse({
    statusCode: 200,
    body: users
  });
};