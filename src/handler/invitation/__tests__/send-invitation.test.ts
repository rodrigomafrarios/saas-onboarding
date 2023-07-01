import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { ScopeEnum } from "@type";
import { invitationGenerator, roleGenerator, tenantGenerator, userGenerator } from "@testUtils";
import { faker } from "@faker-js/faker";
import { Invitation } from "@entity";

import { sendInvitationHandler } from "../send-invitation";

describe("sendInvitation - handler", () => {
  it("should return an error if e-mail doesn't match emailRegex", async () => {
    
    // given
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "PUT",
      path: "/invitation",
      body: JSON.stringify({
        invitee: "harold"
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
    const response = await sendInvitationHandler(event);
    
    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if requester user not found", async () => {
    
    // given
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "PUT",
      path: "/invitation",
      body: JSON.stringify({
        invitee: faker.internet.email().toLowerCase()
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
    const response = await sendInvitationHandler(event);
    
    // then
    expect(response.statusCode).toBe(404);
  });

  it("should return an error if requester isn't an admin", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const userId = faker.string.uuid();
    const requesterEmail = faker.internet.email().toLowerCase();

    await tenantGenerator({ id: tenantId });
    await roleGenerator({ tenantId, id: roleId });
    await userGenerator({ id: userId, tenantId, email: requesterEmail, roleId });

    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "PUT",
      path: "/invitation",
      body: JSON.stringify({
        invitee: faker.internet.email().toLowerCase()
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
    const response = await sendInvitationHandler(event);
    
    // then
    expect(response.statusCode).toBe(403);
  });

  it("should return an error if user already exists", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const requesterEmail = faker.internet.email().toLowerCase();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ tenantId, id: roleId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, email: requesterEmail, roleId })
    ]);

    const userId = faker.string.uuid();
    const invitee = faker.internet.email().toLowerCase();

    await userGenerator({ id: userId, tenantId, email: invitee });
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "PUT",
      path: "/invitation",
      body: JSON.stringify({
        invitee
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
    const response = await sendInvitationHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"User already exists\"");
  });

  it("should resend an invitation", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const requesterEmail = faker.internet.email().toLowerCase();
    const invitationId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ tenantId, id: roleId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, email: requesterEmail, roleId })
    ]);

    const invitee = faker.internet.email().toLowerCase();
    await invitationGenerator({ id: invitationId, tenantId, invitee, isUserAdmin: false });
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "PUT",
      path: "/invitation",
      body: JSON.stringify({
        invitee
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
    const response = await sendInvitationHandler(event);

    // then
    const oldInvitation = await Invitation.getById(invitationId);

    expect(oldInvitation.Item).toBeUndefined();
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchInlineSnapshot("\"{\"sent\":true}\"");
  });
  
  it("should send an invitation", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const roleId = faker.string.uuid();
    const requesterId = faker.string.uuid();
    const requesterEmail = faker.internet.email().toLowerCase();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ tenantId, id: roleId, scope: ScopeEnum.ADMIN }),
      userGenerator({ id: requesterId, tenantId, email: requesterEmail, roleId })
    ]);

    const invitee = faker.internet.email().toLowerCase();
    
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "PUT",
      path: "/invitation",
      body: JSON.stringify({
        invitee
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
    const response = await sendInvitationHandler(event);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchInlineSnapshot("\"{\"sent\":true}\"");
  });  
});