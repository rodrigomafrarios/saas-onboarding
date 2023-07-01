import Joi from "@hapi/joi";
import { emailRegex } from "@core/validation";

export type CompleteSignupBodySchema = {
  hash: string
  invitee: string
  user: {
    givenName: string
    familyName: string
  }
}

export const completeSignupBodySchema = Joi.object().keys({
  hash: Joi.string().required(),
  invitee: Joi.string().regex(emailRegex).required(),
  user: Joi.object().keys({
    givenName: Joi.string().required(),
    familyName: Joi.string().required(),
  }).required()
});
