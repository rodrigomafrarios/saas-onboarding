import Joi from "@hapi/joi";
import { emailRegex } from "@core/validation";

export type ForgotPasswordBodySchema = {
  email: string
}

export const forgotPasswordBodySchema = Joi.object().keys({
  email: Joi.string().regex(emailRegex).required(),
});
