import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { loadUserHandler } from "@handler";
import { faker } from "@faker-js/faker";

describe("loadUser - handler", () => {
  it("should return an error if path parameters are wrong", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const userId = faker.string.nanoid();

    await tenantGenerator({ id: tenantId });
    await roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN });
    await userGenerator({ id: requesterId, tenantId, roleId });

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": tenantId
          }
        }
      }
    });
    
    // when
    const response = await loadUserHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if user not found", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();

    await tenantGenerator({ id: tenantId });
    await roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN });
    await userGenerator({ id: userId, tenantId, roleId });

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": tenantId
          }
        }
      }
    });
    
    // when
    const response = await loadUserHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });
  
  it("should return an error if requester not an admin user", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const userId = faker.string.uuid();

    await tenantGenerator({ id: tenantId });
    await userGenerator({ id: requesterId, tenantId });
    await userGenerator({ id: userId, tenantId });

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": tenantId
          }
        }
      }
    });
    
    // when
    const response = await loadUserHandler(event);

    // then
    expect(response.statusCode).toBe(403);
    expect(response.body).toMatchInlineSnapshot("\"null\"");
  });
  
  it("should return user info", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();

    await tenantGenerator({ id: tenantId });
    await roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN });
    await userGenerator({ id: requesterId, tenantId, roleId });
    await userGenerator({ id: userId, tenantId });

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": tenantId
          }
        }
      }
    });
    
    // when
    const response = await loadUserHandler(event);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toBeUndefined();
  });
});