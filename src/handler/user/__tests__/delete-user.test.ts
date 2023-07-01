import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { deleteUserHandler } from "@handler";
import { faker } from "@faker-js/faker";
import { User } from "@entity";

jest.mock(
  "aws-sdk/clients/cognitoidentityserviceprovider",
  () =>
    class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      adminDeleteUser = jest.fn((...args) => {
        return {
          promise() {
            return { $response: { error: {} } };
          },
        };
      });
    }
);

describe("deleteUser - handler", () => {
  it("should return an error if path parameters are wrong", async () => {
    
    // given
    const requesterId = faker.string.nanoid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
      path: `/admin/user/${requesterId}`,
      pathParameters: {
        id: requesterId
      },
      body: null,
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
    const response = await deleteUserHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if requester user not found", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
      path: `/admin/user/${requesterId}`,
      pathParameters: {
        id: requesterId
      },
      body: null,
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
    const response = await deleteUserHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  describe("User is not requester", () => {
    it("should return an error if requester is not an admin", async () => {

      // given
      const requesterId = faker.string.uuid();
      const userId = faker.string.uuid();
      const tenantId = faker.string.uuid();
      
      await Promise.all([
        tenantGenerator({ id: tenantId }),
        userGenerator({ id: requesterId, tenantId }),
        userGenerator({ id: userId, tenantId })
      ]);
      
      const event = mock<APIGatewayProxyEvent>({
        httpMethod: "DELETE",
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
      const response = await deleteUserHandler(event);

      // then
      expect(response.statusCode).toBe(403);
    });
  });

  it("should return an error if user not belongs to tenant", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();

    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      tenantGenerator({ id: tenantId }),
      userGenerator({ id: requesterId, tenantId, roleId }),
      userGenerator({ id: userId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
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
    const response = await deleteUserHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should return an error if tenant user admin tries to delete himself", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const adminEmail = faker.internet.email().toLowerCase();
    
    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      tenantGenerator({ id: tenantId, adminEmail }),
      userGenerator({ id: requesterId, tenantId, roleId, email: adminEmail })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
      path: `/admin/user/${requesterId}`,
      pathParameters: {
        id: requesterId
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
    const response = await deleteUserHandler(event);

    // then
    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchInlineSnapshot("\"Unauthorized\"");
  });

  it("should delete user", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const adminEmail = faker.internet.email().toLowerCase();
    const userId = faker.string.uuid();

    await Promise.all([
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      tenantGenerator({ id: tenantId, adminEmail }),
      userGenerator({ id: requesterId, tenantId, roleId, email: adminEmail }),
      userGenerator({ id: userId, tenantId })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "DELETE",
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
    const response = await deleteUserHandler(event);

    // then
    const user = await User.getById(tenantId, userId);
    expect(user).toBeUndefined();
    expect(response.statusCode).toBe(204);
  });
});