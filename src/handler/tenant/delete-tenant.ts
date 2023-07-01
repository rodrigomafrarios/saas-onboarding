import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger } from "@utils";
import { ScopeEnum } from "@type";
import { PathParameters, pathParams, schemaValidator } from "@schema";
import { ArgumentError } from "@errors";
import { Role, Tenant, User } from "@entity";
import { cognito } from "@core/aws-client";

/**
 * @param event.pathParameters.id: string
 * 
 * @description It deletes an tenant.
 * 
 * @returns
 *  HTTP 400 - Bad Request
 *  HTTP 403 - Forbiddeen
 *  HTTP 404 - Not found
 *  HTTP 204 - No Content
 */

export const deleteTenantHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const validation = schemaValidator<PathParameters>(pathParams, { ...event.pathParameters });
  if (validation instanceof ArgumentError) {
    return formatJsonResponse({
      statusCode: 400,
      body: validation.message
    });
  }

  const { id } = validation;

  const tenant = await Tenant.getById(id);
  if (!tenant) {
    return formatJsonResponse({
      statusCode: 404,
      body: "Tenant not found"
    });
  }

  const { userId } = getRequestContextClaim(event.requestContext);

  const user = await User.getById(tenant.id, userId);
  if (!user) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }

  const role = await Role.getById(tenant.id, user.roleId);
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

  const tenantUserAdminEmail = tenant.adminEmail === user.email;
  if (!tenantUserAdminEmail) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  logger.info("Data validated.");

  // TODO: should also delete invitations and roles?
  const users = await User.getByTenantId(tenant.id);
  const deleteUsersOperations = users?.map((user) => user.delete());

  const usersCognito = await cognito
    .listUsers({
      UserPoolId: process.env.USERPOOL as string
    })
    .promise();
  
  const deleteUsersCognitoOperations = usersCognito.Users?.map(({ Attributes: attributes }) => {
    const email = attributes?.find(attr => attr.Name === "email")?.Value;

    return cognito.adminDeleteUser({
      UserPoolId: process.env.USERPOOL as string,
      Username: email as string
    }).promise();
  });

  await Promise.all([
    deleteUsersOperations,
    tenant.delete(),
    ...deleteUsersCognitoOperations as never[]
  ]);

  logger.info("Tenant was deleted.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};