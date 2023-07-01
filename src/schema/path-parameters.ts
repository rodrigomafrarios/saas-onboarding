import Joi from "@hapi/joi";

export type PathParameters = {
  id: string
}

export const pathParams = Joi.object().keys({
  id: Joi.string().guid({ version: "uuidv4" })
});