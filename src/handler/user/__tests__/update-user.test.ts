import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { updateUserHandler } from "@handler";
import { faker } from "@faker-js/faker";
import { Tenant } from "@entity";

jest.mock(
  "aws-sdk/clients/cognitoidentityserviceprovider",
  () =>
    class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      adminUpdateUserAttributes = jest.fn((...args) => {
        return {
          promise() {
            return { $response: { error: {} } };
          },
        };
      });
    }
);

describe("updateUser - handler", () => {
  it("should return an error if arguments are wrong", async () => {
    
    // given
    const requesterId = faker.string.nanoid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/user/${requesterId}`,
      pathParameters: {
        id: requesterId
      },
      body: JSON.stringify({
        givenName: "",
        familyName: "",
        email: faker.animal.bird(),
        roleId: ""
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": requesterId,
            "custom:tenantId": faker.string.uuid()
          }
        }
      }
    });
    
    // when
    const response = await updateUserHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if requester user not found", async () => {
    
    // given
    const userId = faker.string.uuid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: JSON.stringify({
        givenName: faker.animal.bear(),
        familyName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        roleId: faker.string.uuid()
      }),
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
    const response = await updateUserHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  it("should return an error if requester is not an admin", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const userId = faker.string.uuid();
    
    await Promise.all([
      tenantGenerator({ id: tenantId }),
      userGenerator({ id: userId, tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: JSON.stringify({
        givenName: faker.animal.bear(),
        familyName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        roleId: faker.string.uuid()
      }),
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
    const response = await updateUserHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should return an error if user not belongs to tenant", async () => {

    // given
    const tenantId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const requesterRoleId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ id: requesterRoleId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, roleId: requesterRoleId }),
      roleGenerator({ id: roleId }),
      userGenerator({ id: userId, roleId })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: JSON.stringify({
        givenName: faker.animal.bear(),
        familyName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        roleId
      }),
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
    const response = await updateUserHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should update the user", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const requesterRoleId = faker.string.uuid();
    const userRoleId = faker.string.uuid();
    const userId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ id: requesterRoleId, tenantId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, roleId: requesterRoleId }),
      roleGenerator({ id: userRoleId, tenantId, scope: ScopeEnum.MEMBER }),
      userGenerator({ id: userId, tenantId, roleId: userRoleId })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: `/admin/user/${userId}`,
      pathParameters: {
        id: userId
      },
      body: JSON.stringify({
        givenName: faker.animal.bear(),
        familyName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        roleId: requesterRoleId
      }),
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
    const response = await updateUserHandler(event);

    // then
    expect(response.statusCode).toBe(204);
    expect(response.body).toMatchInlineSnapshot("\"null\"");
  });

  describe("admin user", () => {
    it("should update tenant if admin e-mail", async () => {
      
      // given
      const tenantId = faker.string.uuid();
      const requesterId = faker.string.uuid();
      const requesterRoleId = faker.string.uuid();
      const adminEmail = faker.internet.email().toLowerCase();

      await Promise.all([
        tenantGenerator({ id: tenantId, adminEmail }),
        roleGenerator({ id: requesterRoleId, tenantId, scope: ScopeEnum.ADMIN }),
        userGenerator({ id: requesterId, tenantId, email: adminEmail, roleId: requesterRoleId })
      ]);

      const newAdminEmail = faker.internet.email().toLowerCase();

      const event = mock<APIGatewayProxyEvent>({
        httpMethod: "POST",
        path: `/admin/user/${requesterId}`,
        pathParameters: {
          id: requesterId
        },
        body: JSON.stringify({
          givenName: faker.animal.bear(),
          familyName: faker.person.lastName(),
          email: newAdminEmail,
          roleId: requesterRoleId
        }),
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
      const response = await updateUserHandler(event);

      // then
      const tenant = await Tenant.getById(tenantId);
      expect(tenant?.adminEmail).toEqual(newAdminEmail);
      expect(response.statusCode).toBe(204);
      expect(response.body).toMatchInlineSnapshot("\"null\"");
    });
  });  
});