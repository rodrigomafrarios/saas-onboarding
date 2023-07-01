import { mock } from "jest-mock-extended";
import { APIGatewayProxyEvent } from "aws-lambda";

import { tenantGenerator, userGenerator } from "@testUtils";
import { meHandler } from "@handler";
import { faker } from "@faker-js/faker";

describe("me - handler", () => {
  it("should return an error if user not found", async () => {
    
    // given
    const event = mock<APIGatewayProxyEvent>({
      body: null,
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
    const response = await meHandler(event);

    // then
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchInlineSnapshot("\"User not found\"");
  });

  it("should return me info", async () => {

    // given
    const userId = faker.string.uuid();
    const tenantId = faker.string.uuid();

    await Promise.all([
      tenantGenerator({ id: tenantId }),
      userGenerator({ id: userId, tenantId })
    ]);

    const event = mock<APIGatewayProxyEvent>({
      body: null,
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
    const response = await meHandler(event);

    // then
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toBeUndefined();
  });
});