import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { listUsersHandler } from "@handler";
import { faker } from "@faker-js/faker";

describe("listUsers - handler", () => {
  it("should return an error if request user not found", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      path: "/users",
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
    const response = await listUsersHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  it("should return an error if request user not an admin", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ id: roleId, tenantId }),
      userGenerator({ id: requesterId, tenantId, roleId })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      path: "/users",
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
    const response = await listUsersHandler(event);

    // then
    expect(response.statusCode).toBe(403);
    expect(response.body).toMatchInlineSnapshot("\"null\"");
  });

  it("should list all users", async () => {
    
    // given
    const requesterId = faker.string.uuid();
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();

    const userTasks = Array.from({ length: 5 }, () => userGenerator({ tenantId }));
    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ id: roleId, tenantId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, roleId }),
      ...userTasks
    ]);

    const event = mock<APIGatewayProxyEvent>({
      path: "/users",
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
    const response = await listUsersHandler(event);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toBeUndefined();
  });
});