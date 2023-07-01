import { faker } from "@faker-js/faker";

import { TenantTierEnum } from "../src/type";
import { Tenant } from "../src/entity/tenant";

export const pickOneTenantTier = () => {
  const tiers = Object.values(TenantTierEnum);
  return tiers[Math.floor(Math.random() * tiers.length)];
};

export const registerTenantEventBodyMock = (data?: Partial<Tenant>) => ({
  name: data?.name ?? faker.company.name(),
  adminEmail: data?.adminEmail ?? faker.internet.email().toLowerCase(),
  subDomain: faker.internet.domainName(),
  tier: pickOneTenantTier()
});