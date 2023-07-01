import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { faker } from "@faker-js/faker";
import { Tenant, User } from "@entity";

import { deleteTenantHandler } from "../delete-tenant";

jest.mock(
  "aws-sdk/clients/cognitoidentityserviceprovider",
  () =>
    class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      listUsers = jest.fn((...args) => {
        return {
          promise() {
            return {
              $response: { error: {} },
              "Users": [
                {
                  "Username": "c32438a2-80a1-707d-af38-ac8bfedaf943",
                  "Attributes": [
                    {
                      "Name": "sub",
                      "Value": "c32438a2-80a1-707d-af38-ac8bfedaf943"
                    },
                    {
                      "Name": "email_verified",
                      "Value": "true"
                    },
                    {
                      "Name": "given_name",
                      "Value": "Rodrigo"
                    },
                    {
                      "Name": "family_name",
                      "Value": "Mafra"
                    },
                    {
                      "Name": "email",
                      "Value": "rodrigomafrarios@gmail.com"
                    },
                    {
                      "Name": "custom:userId",
                      "Value": "6e47b29c-5736-40f1-b9f7-bcafc303d9fd"
                    }
                  ],
                  "UserCreateDate": "2023-06-16T14:33:56.866000+02:00",
                  "UserLastModifiedDate": "2023-06-19T09:19:20.866000+02:00",
                  "Enabled": true,
                  "UserStatus": "CONFIRMED"
                }
              ]
            };
          },
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      adminDeleteUser = jest.fn((...args) => {
        return {
          promise() {
            return {
              $response: {
                error: {}
              },
            };
          },
        };
      });
    }
);

describe("deleteTenant - handler", () => {

  it("should return an error if paths parameters are wrong", async () => {
    // given
    const tenantId = faker.string.nanoid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": faker.string.uuid(),
            "custom:tenantId": faker.string.uuid()
          }
        }
      }
    });
    
    // when
    const response = await deleteTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
  });

  it("should return an error if tenant not found", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": faker.string.uuid(),
            "custom:tenantId": faker.string.uuid()
          }
        }
      }
    });
    
    // when
    const response = await deleteTenantHandler(event);

    // then
    expect(response.statusCode).toBe(404);
  });

  it("should return an error if user not found", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    await tenantGenerator({ id: tenantId });
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
      path: `/admin/tenant/${tenantId}`,
      pathParameters: {
        id: tenantId
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": faker.string.uuid(),
            "custom:tenantId": faker.string.uuid()
          }
        }
      }
    });
    
    // when
    const response = await deleteTenantHandler(event);

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
      httpMethod: "DELETE",
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
    const response = await deleteTenantHandler(event);

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
      httpMethod: "DELETE",
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
    const response = await deleteTenantHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should return an error if request user isn't the one that registered tenant", async () => {
    
    // given
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    
    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: userId, tenantId, roleId }),
      tenantGenerator({ id: tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
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
    const response = await deleteTenantHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should delete the tenant", async () => {

    // given
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const adminEmail = faker.internet.email().toLowerCase();
    
    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: userId, tenantId, roleId, email: adminEmail }),
      tenantGenerator({ id: tenantId, adminEmail })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
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
    const response = await deleteTenantHandler(event);

    // then
    const [users, tenant] = await Promise.all([
      User.getByTenantId(tenantId),
      Tenant.getById(tenantId)
    ]);
    
    expect(response.statusCode).toBe(204);
    expect(tenant).toBeUndefined();
    expect(users).toBeUndefined();
  });
});