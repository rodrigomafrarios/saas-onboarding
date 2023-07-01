import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { pickOneTenantTier, roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { updateTenantHandler } from "@handler";
import { faker } from "@faker-js/faker";

describe("updateTenant - handler", () => {
  it("should return an error if arguments are wrong", async () => {
    
    // given
    const tenantId = faker.string.nanoid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: faker.animal.bear(),
        adminEmail: faker.animal.cow()
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": faker.string.uuid(),
            "custom:tenantId": faker.string.uuid(),
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if tenant not found", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: pickOneTenantTier(),
        adminEmail: faker.internet.email()
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": faker.string.uuid(),
            "custom:tenantId": faker.string.uuid(),
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
  });

  it("should return an error if user not found", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    await tenantGenerator({ id: tenantId });
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: pickOneTenantTier(),
        adminEmail: faker.internet.email()
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": faker.string.uuid(),
            "custom:tenantId": faker.string.uuid(),
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  it("should return an error if role not found", async () => {
    
    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
  
    await Promise.all([
      userGenerator({ id: userId, tenantId }),
      tenantGenerator({ id: tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: pickOneTenantTier(),
        adminEmail: faker.internet.email()
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": faker.string.uuid(),
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"Role not found\"");
  });

  it("should return an error if user is not an admin", async () => {
    
    // given
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    
    await Promise.all([
      roleGenerator({ id: roleId, tenantId }),
      userGenerator({ id: userId, tenantId, roleId }),
      tenantGenerator({ id: tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: pickOneTenantTier(),
        adminEmail: faker.internet.email()
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": userId,
            "custom:tenantId": tenantId,
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should return an error if user not belongs to the tenant", async () => {
    
    // given
    const roleId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();

    const userId = faker.string.uuid();
    const userAdminEmail = faker.internet.email();

    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, roleId }),
      userGenerator({ id: userId, email: userAdminEmail }),
      tenantGenerator({ id: tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: pickOneTenantTier(),
        adminEmail: userAdminEmail
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": tenantId,
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should update the tenant", async () => {
    
    // given
    const roleId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();

    const userId = faker.string.uuid();
    const userEmail = faker.internet.email();

    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, roleId }),
      userGenerator({ id: userId, tenantId, email: userEmail, roleId }),
      tenantGenerator({ id: tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      body: JSON.stringify({
        name: faker.company.name(),
        tier: pickOneTenantTier(),
        adminEmail: userEmail
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": tenantId,
          }
        }
      }
    });
    
    // when
    const response = await updateTenantHandler(event);

    // then
    expect(response.statusCode).toBe(204);
  });
});