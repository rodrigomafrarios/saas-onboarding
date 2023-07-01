import Joi from "@hapi/joi";
import { emailRegex } from "@core/validation";

export type SendInvitationBodySchema = {
  invitee: string
}

export const sendInvitationBodySchema = Joi.object().keys({
  invitee: Joi.string().regex(emailRegex).required()
});
