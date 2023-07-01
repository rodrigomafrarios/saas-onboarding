import { nanoid } from "nanoid";
import { mock } from "jest-mock-extended";
import dayjs from "dayjs";
import { APIGatewayProxyEvent } from "aws-lambda";

import { InvitationStatusEnum } from "@type";
import { hashStub, invitationGenerator, roleGenerator, tenantGenerator } from "@testUtils";
import { completeSignupHandler } from "@handler";
import { faker } from "@faker-js/faker";
import { Invitation, User } from "@entity";

jest.mock(
  "aws-sdk/clients/cognitoidentityserviceprovider",
  () =>
    class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      adminCreateUser = jest.fn((...args) => {
        return {
          promise() {
            return { $response: { error: {} } };
          },
        };
      });
    }
);

describe("completeSignup - handler", () => {
  it("should return an error if e-mail does not match with regex rule", async () => {
    // given
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        invitee: faker.animal.cat(),
        hash: ""
      })
    });

    // when
    const response = await completeSignupHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Something went wrong with the arguments provided.\"");
  });

  it("should return an error if invitation not found", async () => {
    // given
    const hash = await hashStub(nanoid());
    
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        invitee: faker.internet.email().toLowerCase(),
        hash,
        user: {
          givenName: faker.person.firstName(),
          familyName: faker.person.lastName(),
        }
      })
    });

    // when
    const response = await completeSignupHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"Invitation not found.\"");
  });

  it("should return an error if invitation already accepted", async () => {
    // given
    const tenantId = faker.string.uuid();
    await tenantGenerator({ id: tenantId });
    const secret = nanoid(5);
    const hash = await hashStub(secret);
    const invitee = faker.internet.email().toLowerCase();
    await invitationGenerator({
      tenantId,
      invitee,
      hashSecret: secret,
      status: InvitationStatusEnum.ACCEPTED
    });

    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        invitee,
        hash,
        user: {
          givenName: faker.person.firstName(),
          familyName: faker.person.lastName(),
        }
      })
    });

    // when
    const response = await completeSignupHandler(event);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Invitation already accepted.\"");
  });

  it("should return an error if hash does not match", async () => {
    // given
    const hash = await hashStub(nanoid());
    const invitee = faker.internet.email().toLowerCase();
    await invitationGenerator({ invitee });
    
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        invitee,
        hash,
        user: {
          givenName: faker.person.firstName(),
          familyName: faker.person.lastName(),
        }
      })
    });

    // when
    const response = await completeSignupHandler(event);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Hash doesn't match.\"");
  });

  it("should return an error if expired invitation", async () => {
    
    // given
    const secret = nanoid(5);
    const hash = await hashStub(secret);
    const invitee = faker.internet.email().toLowerCase();
    await invitationGenerator({
      invitee,
      hashSecret: secret,
      expiresAt: dayjs().subtract(2, "day").toISOString()
    });
    
    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        invitee,
        hash,
        user: {
          givenName: faker.person.firstName(),
          familyName: faker.person.lastName(),
        }
      })
    });

    // when
    const response = await completeSignupHandler(event);

    const invitation = await Invitation.getByEmail(invitee);

    // then
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchInlineSnapshot("\"Invitation expired.\"");

    expect(invitation?.status).toBe(InvitationStatusEnum.EXPIRED);
  });
  
  it("should create an new user", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const secret = nanoid(5);
    const hash = await hashStub(secret);
    const invitee = faker.internet.email().toLowerCase();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      roleGenerator({ tenantId }),
      invitationGenerator({
        tenantId,
        invitee,
        hashSecret: secret,
      })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      body: JSON.stringify({
        invitee,
        hash,
        user: {
          givenName: faker.person.firstName(),
          familyName: faker.person.lastName(),
        }
      })
    });

    // when
    const response = await completeSignupHandler(event);

    // then
    const [user, invitation] = await Promise.all([
      User.getByEmail(invitee),
      Invitation.getByEmail(invitee)
    ]);

    expect(invitation).not.toBeUndefined();
    expect(invitation?.status).toEqual(InvitationStatusEnum.ACCEPTED);
    expect(user).not.toBeUndefined();
    expect(user?.email).toEqual(invitee);
    
    expect(response.statusCode).toBe(204);
  });
});