import Joi from "@hapi/joi";
import { passwordRegex } from "@core/validation";

export type ResetPasswordBodySchema = {
  newPassword: string
  hash: string
}

export const resetPasswordBodySchema = Joi.object().keys({
  newPassword: Joi
    .string()
    .regex(passwordRegex)
    .required(),
  hash: Joi.string().required()
});