import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { tenantGenerator, userGenerator } from "@testUtils";
import { faker } from "@faker-js/faker";
import { User } from "@entity";

import { forgotPasswordHandler } from "../forgot-password";

describe("forgotPassword - handler", () => {
  it("should return an error if path parameters are wrong", async () => {
    
    // given
    const event = mock<APIGatewayProxyEvent>({
      path: "/forgot-password",
      body: JSON.stringify({
        email: faker.animal.bear()
      })
    });
    
    // when
    const response = await forgotPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(400);
  });

  it("should return an error if user not found", async () => {

    // given
    const event = mock<APIGatewayProxyEvent>({
      path: "/forgot-password",
      body: JSON.stringify({
        email: faker.internet.email()
      })
    });

    // when
    const response = await forgotPasswordHandler(event);

    // then
    expect(response.statusCode).toBe(404);
  });

  it("should send e-mail to reset password", async () => {

    // given
    const tenantId = faker.string.uuid();
    const userId = faker.string.uuid();
    const email = faker.internet.email();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      userGenerator({ id: userId, tenantId, email })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      path: "/forgot-password",
      body: JSON.stringify({
        email
      })
    });

    // when
    const response = await forgotPasswordHandler(event);

    // then
    const user = await User.getById(tenantId, userId);
    expect(user).not.toBeUndefined();
    expect(user?.resetPassword).toBeTruthy();
    expect(response.statusCode).toBe(204);
  });
});