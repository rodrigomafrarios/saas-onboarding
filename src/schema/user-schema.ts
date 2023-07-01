import Joi from "@hapi/joi";
import { emailRegex } from "@core/validation";

export type UpdateUserBodySchema = {
  id: string
  givenName?: string
  familyName?: string
  email?: string
  roleId?: string
}

export const updateUserBodySchema = Joi.object().keys({
  id: Joi.string().guid({ version: "uuidv4" }).required(),
  givenName: Joi.string().optional(),
  familyName: Joi.string().optional(),
  email: Joi.string().regex(emailRegex).optional(),
  roleId: Joi.string().optional()
});