import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { registerTenantEventBodyMock, tenantGenerator, userGenerator } from "@testUtils";
import { registerTenantHandler } from "@handler";
import { faker } from "@faker-js/faker";
import { Invitation, Tenant } from "@entity";

describe("registerTenant - handler", () => {
  it("should return an error if arguments are missing", async () => {
    
    // given
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        name: "harold"
      })
    });

    // when
    const response = await registerTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if arguments are wrong", async () => {
    
    // given
    const body = registerTenantEventBodyMock();
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        ...body,
        adminEmail: faker.animal.bear()
      })
    });

    // when
    const response = await registerTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if sub domain already in use", async () => {
    
    // given
    const body = registerTenantEventBodyMock();
    await tenantGenerator(body);

    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify(body)
    });

    // when
    const response = await registerTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Subdomain already in use\"");
  });

  it("should return an error if e-mail already in use", async () => {
    
    // given
    const body = registerTenantEventBodyMock();
    const tenantId = faker.string.uuid();
    const userEmail = faker.internet.email().toLowerCase();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      userGenerator({ email: userEmail, tenantId })
    ]);
    
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        ...body,
        subDomain: faker.internet.domainWord(),
        adminEmail: userEmail
      })
    });

    // when
    const response = await registerTenantHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"E-mail already in use\"");
  });

  it("should create an tenant", async () => {
    
    // given
    const body = registerTenantEventBodyMock();
    
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify(body)
    });

    // when
    await registerTenantHandler(event);

    // then
    const [ tenant, invitation ] = await Promise.all([
      Tenant.getBySubDomain(body.subDomain),
      Invitation.getByEmail(body.adminEmail)

    ]);
    
    expect(tenant).not.toBeUndefined();
    expect(tenant).toMatchObject(body);
    expect(invitation).not.toBeUndefined();
    expect(invitation?.invitee).toEqual(tenant?.adminEmail);
    expect(invitation?.isUserAdmin).toBeTruthy();
  });
});