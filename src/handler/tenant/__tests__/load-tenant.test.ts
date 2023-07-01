import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { faker } from "@faker-js/faker";

import { loadTenantHandler } from "../load-tenant";

describe("loadTenant - handler", () => {
  it("should return an error if path parameters are wrong", async () => {
    
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.nanoid();
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId
          }
        }
      }
    });

    // when
    const response = await loadTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if tenant not found", async () => {
    
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId
          }
        }
      }
    });

    // when
    const response = await loadTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  it("should return an error if user not found", async () => {
    
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    await tenantGenerator({ id: tenantId });
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId
          }
        }
      }
    });

    // when
    const response = await loadTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  it("should return an error if role not found", async () => {
    
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      userGenerator({ id: userId, tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId
          }
        }
      }
    });

    // when
    const response = await loadTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"Role not found\"");
  });

  it("should return an error if user isn't an admin", async () => {
    
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
  
    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ tenantId, id: roleId }),
      userGenerator({ id: userId, tenantId, roleId })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId
          }
        }
      }
    });

    // when
    const response = await loadTenantHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should load tenant", async () => {
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    
    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ tenantId, id: roleId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: userId, tenantId, roleId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "GET",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId
          }
        }
      }
    });

    // when
    const response = await loadTenantHandler(event);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toBeUndefined();
  });
});