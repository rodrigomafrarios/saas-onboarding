import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim, logger, removeUndefined } from "@utils";
import { ScopeEnum, UpdateUserParams } from "@type";
import { schemaValidator, updateUserBodySchema, UpdateUserBodySchema } from "@schema";
import { ArgumentError } from "@errors";
import { Role, Tenant, User } from "@entity";
import { cognito } from "@core/aws-client";

/**
 * 
 * @param event.body
 * @field givenName: string
 * @field familyName: string
 * @field email: string
 * @field roleId: string
 * 
 * @description It updates user information.
 *  
 * @returns 
 * HTTP 204 - No Content
 * HTTP 400 - Bad Request
 * HTTP 403 - Forbidden
 * HTTP 404 - Not Found
 */
export const updateUserHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const validation = schemaValidator<UpdateUserBodySchema>(updateUserBodySchema, {
    ...JSON.parse(event.body as string),
    ...event.pathParameters
  } as object);
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

  const requesterRole = await Role.getById(requester.tenantId, requester.roleId);
  const requesterAdmin = requesterRole && requesterRole.scope === ScopeEnum.ADMIN;
  if (!requesterAdmin) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  const { id, givenName, familyName, email, roleId } = validation;
  const user = await User.getById(requester.tenantId, id);
  const userBelongsToTenant = user && user.tenantId === requester.tenantId;
  if (!userBelongsToTenant) {
    return formatJsonResponse({
      statusCode: 403,
      body: null
    });
  }

  logger.info("Data validated.");

  if (email) {
    await cognito
      .adminUpdateUserAttributes({
        UserPoolId: process.env.USERPOOL as string,
        Username: user.email,
        UserAttributes: [{
          Name: "email",
          Value: email
        }]
      })
      .promise();
    
    const tenant = await Tenant.getById(requester.tenantId);
    const tenantAdminEmail = tenant && tenant.adminEmail === user.email;
    if (tenantAdminEmail) {
      
      logger.info({ email }, "Tenant admin e-mail will be replaced.");

      await tenant.update({
        adminEmail: email
      });
    }
  }

  const params = removeUndefined<UpdateUserParams>({
    givenName,
    familyName,
    email,
    roleId
  });

  await user.update(params);

  logger.info("User has been updated.");

  return formatJsonResponse({
    statusCode: 204,
    body: null
  });
};