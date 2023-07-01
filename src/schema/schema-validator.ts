import { logger } from "@utils";
import { Schema } from "@hapi/joi";
import { ArgumentError } from "@errors";

export const schemaValidator = <T>(schema: Schema, body: string | object) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const parsedBody: object = typeof body === "string" ? JSON.parse(body) : body;
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { value, error } = schema.validate(parsedBody, { abortEarly: false });
  if (error) {
    logger.error(error.message);
    return new ArgumentError();
  }
  
  return value as T;
};