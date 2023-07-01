/* 
eslint-disable @typescript-eslint/no-unsafe-assignment,
@typescript-eslint/no-explicit-any,
@typescript-eslint/no-unsafe-argument,
@typescript-eslint/no-unsafe-member-access,
@typescript-eslint/restrict-template-expressions
 */

import { APIGatewayProxyEvent } from "aws-lambda";

type RequestContextClaim = {
  tenantId: string
  userId: string
}

export const getRequestContextClaim = (requestContext: APIGatewayProxyEvent["requestContext"]): RequestContextClaim => {
  return {
    tenantId: requestContext.authorizer?.claims["custom:tenantId"],
    userId: requestContext.authorizer?.claims["custom:userId"],
  };
};