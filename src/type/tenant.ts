import { FromEnum } from "./from-enum";

export enum TenantTierEnum {
  FREE = "free",
  STANDARD = "standard",
  PREMIUM = "premium"
}

export type TenantTierType = FromEnum<typeof TenantTierEnum>;

export type UpdateTenantParams = {
  name?: string
  tier?: TenantTierEnum
  adminEmail?: string
}