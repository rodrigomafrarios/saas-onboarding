import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger } from "@utils";
import { ScopeEnum } from "@type";
import { PathParameters, pathParams, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Role, Tenant, User } from "@entity";
import { cognito } from "@core/aws-client";

/**
 * 
 * @param event.pathParameters.id: string
 * 
 * @description It deletes an user from a tenant who is not the same that registered the tenant.
 * 
 * @returns 
 * HTTP 204 - No Content
 * HTTP 400 - Bad Request
 * HTTP 401 - Unauthorized
 * HTTP 403 - Forbidden
 * HTTP 404 - Not Found
 */
export const deleteUserHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const validation = schemaValidator<PathParameters>(pathParams, { ...event.pathParameters });
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

  const { id } = validation;

  const userIsRequester = requester.id === id;

  if (!userIsRequester) {
    const requesterRole = await Role.getById(requester.tenantId, requester.roleId);
    const requesterAdmin = requesterRole && requesterRole.scope === ScopeEnum.ADMIN;
    if (!requesterAdmin) {
      return formatJsonResponse({
        statusCode: 403,
        body: null
      });
    }
  }

  const user = await User.getById(requester.tenantId, id);
  const userBelongsToTenant = user && user.tenantId === requester.tenantId;
  if (!userBelongsToTenant) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  //User's e-mail address is vinculated to tenant register.
  const tenant = await Tenant.getById(requester.tenantId);
  const tenantAdminUser = tenant && tenant.adminEmail === user.email;
  if (tenantAdminUser) {
    return formatJsonResponse({
      statusCode: 401,
      body: "Unauthorized"
    });
  }

  logger.info("Data validated.");
  
  await Promise.all([
    user.delete(),
    cognito
      .adminDeleteUser({
        UserPoolId: process.env.USERPOOL as string,
        Username: user.email
      })
      .promise()
  ]);
  
  logger.info("User has been deleted.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};