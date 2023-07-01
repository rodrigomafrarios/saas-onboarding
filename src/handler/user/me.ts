import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { formatJsonResponse, getRequestContextClaim } from "@utils";
import { User } from "@entity";

/**
 * 
 * @description It returns claim user info
 * 
 * @returns
 * HTTP 200 - OK
 * HTTP 404 - Not Found
 */
export const meHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  const { tenantId, userId } = getRequestContextClaim(event.requestContext);
  const user = await User.getById(tenantId, userId);

  if (!user) {
    return formatJsonResponse({
      statusCode: 404,
      body: "User not found"
    });
  }
    
  return formatJsonResponse({
    statusCode: 200,
    body: user
  });
};