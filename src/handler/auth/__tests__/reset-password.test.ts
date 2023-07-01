import { mock } from "jest-mock-extended";
import dayjs from "dayjs";
import { APIGatewayProxyEvent } from "aws-lambda";

import { generateResetPasswordTokenStub, tenantGenerator, userGenerator } from "@testUtils";
import { faker } from "@faker-js/faker";
import { User } from "@entity";

import { resetPasswordHandler } from "../reset-password";

jest.mock(
  "aws-sdk/clients/cognitoidentityserviceprovider",
  () =>
    class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      adminSetUserPassword = jest.fn((...args) => {
        return {
          promise() {
            return { $response: { error: {} } };
          },
        };
      });
    }
);

describe("resetPassword - handler", () => {
  it("should return an error if arguments are wrong", async () => {
    
    // given
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "abc123",
        hash: ""
      })
    });
    
    // when
    const response = await resetPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(400);
  });

  it("should throw if cannot verify jwt", async () => {
    
    // given
    const hash = generateResetPasswordTokenStub(undefined, "abc");
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "Abc@123!",
        hash
      })
    });
    
    // when
    const promise = resetPasswordHandler(event);

    // then
    await expect(promise).rejects.toThrow();
  });

  it("should return an error if jwt has expired", async () => {    
    
    // given
    const hash = generateResetPasswordTokenStub({
      expiresAt: dayjs().subtract(1, "day").toISOString()
    });

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "Abc@123!",
        hash
      })
    });
    
    // when
    const response = await resetPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(400);
  });

  it("should return an error if tenant not found", async () => {
    
    // given
    const hash = generateResetPasswordTokenStub();
    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "Abc@123!",
        hash
      })
    });
    
    // when
    const response = await resetPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(404);
  });

  it("should return an error if user not found", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const subDomain = faker.animal.cat().toLowerCase();
    const hash = generateResetPasswordTokenStub({ subDomain });
    await tenantGenerator({ id: tenantId, subDomain });

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "Abc@123!",
        hash
      })
    });
    
    // when
    const response = await resetPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(404);
  });

  it("should return an error if user don't belong to a specific tenant", async () => {
    
    // given
    const tenantId = faker.string.uuid();
    const userEmail = faker.internet.email();
    const subDomain = faker.animal.cat().toLowerCase();
    const hash = generateResetPasswordTokenStub({ subDomain, email: userEmail });
    
    await Promise.all([
      tenantGenerator({ id: tenantId, subDomain }),
      userGenerator({ email: userEmail, resetPassword: true })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "Abc@123!",
        hash
      })
    });
    
    // when
    const response = await resetPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(403);
  });

  it("should reset password", async () => {

    // given
    const tenantId = faker.string.uuid();
    const userId = faker.string.uuid();
    const userEmail = faker.internet.email();
    const subDomain = faker.animal.cat().toLowerCase();
    const hash = generateResetPasswordTokenStub({ subDomain, email: userEmail });
    
    await Promise.all([
      tenantGenerator({ id: tenantId, subDomain }),
      userGenerator({ id: userId, email: userEmail, tenantId, resetPassword: true })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      httpMethod: "POST",
      path: "/reset-password",
      body: JSON.stringify({
        newPassword: "Abc@123!",
        hash
      })
    });
    
    // when
    const response = await resetPasswordHandler(event);

    // then
    const user = await User.getById(tenantId, userId);
    expect(user).not.toBeUndefined();
    expect(user?.resetPassword).toBeFalsy();
    expect(response.statusCode).toBe(204);
  });
});