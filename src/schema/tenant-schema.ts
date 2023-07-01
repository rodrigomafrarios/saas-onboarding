import { TenantTierEnum, TenantTierType } from "@type";
import Joi from "@hapi/joi";
import { emailRegex } from "@core/validation";

export type RegisterTenantBodySchema = {
  name: string
  adminEmail: string
  subDomain: string
  tier: TenantTierType
}

export const registerTenantBodySchema = Joi.object().keys({
  name: Joi.string().required(),
  adminEmail: Joi.string().regex(emailRegex).required(),
  subDomain: Joi.string().required(),
  tier: Joi.string().required()
});

export type UpdateTenantBodySchema = {
  id: string
  name?: string
  tier?: TenantTierEnum
  adminEmail?: string
}

export const updateTenantBodySchema = Joi.object().keys({
  id: Joi.string().guid({ version: "uuidv4" }),
  name: Joi.string().optional(),
  adminEmail: Joi.string().regex(emailRegex).optional(),
  tier: Joi.string().allow("free", "standard", "premium").only().optional()
});
