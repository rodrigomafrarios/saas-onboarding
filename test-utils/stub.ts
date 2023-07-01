import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";

import { InvitationStatusEnum, ScopeEnum } from "@type";
import { faker } from "@faker-js/faker";
import Config from "@config";

import { pickOneTenantTier } from "./mock";
import { Invitation, Role, Tenant, User } from "../src/entity";
import { ddbDocument as dynamodb } from "../src/core/aws-client";

export const tenantGenerator = async (data?: Partial<Tenant>) => {
  try {
    const tier = pickOneTenantTier();

    const tenant = new Tenant(
      data?.id ?? faker.string.uuid(),
      data?.adminEmail ?? faker.internet.email(),
      data?.subDomain ?? faker.internet.domainName(),
      data?.name ?? faker.company.name(),
      data?.tier ?? tier,
      data?.createdAt ?? new Date().toISOString()
    );

    return dynamodb
      .transactWrite({
        TransactItems: [{
          Put: {
            TableName: process.env.GLOBAL_TABLE as string,
            Item: tenant.data
          }
        }]
      })
      .promise();
  } catch (error) {
    console.log("\x1b[31m Error attempting to create tenant");
    throw error;
  }
};

export const userGenerator = async (data?: Partial<User>) => {
  try {

    const user = new User(
      data?.id ?? faker.string.uuid(),
      data?.tenantId ?? faker.string.uuid(),
      data?.roleId ?? faker.string.uuid(),
      data?.givenName ?? faker.person.firstName(),
      data?.familyName ?? faker.person.lastName(),
      data?.email ?? faker.internet.email().toLowerCase(),
      data?.createdAt ?? new Date().toISOString(),
      data?.resetPassword ?? false
    );
    
    return dynamodb
      .transactWrite({
        TransactItems: [{
          Put: {
            TableName: process.env.GLOBAL_TABLE as string,
            Item: user.data
          }
        }]
      })
      .promise();
  } catch (error) {
    console.log("\x1b[31m Error attempting to create user");
    throw error;
  }
};

export const hashStub = async (secret: string) => {
  return bcrypt.hash(secret, 10);
};

export const generateResetPasswordTokenStub = (data?: Partial<{ expiresAt: string; subDomain: string; email: string }>, secret?: string) => jwt.sign({
  expiresAt: data?.expiresAt ?? dayjs().add(5, "hours").toISOString(),
  subDomain: data?.subDomain ?? faker.animal.bear(),
  email: data?.email ?? faker.internet.email()
}, secret ?? Config.jwtSecret);

export const invitationGenerator = async (data?: Partial<Invitation>) => {
  try {
    
    const invitation = new Invitation(
      data?.id ?? faker.string.uuid(),
      data?.tenantId ?? faker.string.uuid(),
      data?.invitee ?? faker.internet.email().toLowerCase(),
      data?.hashSecret ?? await hashStub(nanoid()),
      data?.status ?? InvitationStatusEnum.SENT,
      data?.isUserAdmin ?? false,
      data?.sentAt ?? new Date().toISOString(),
      data?.expiresAt ?? dayjs().add(1, "day").toISOString()
    );

    return dynamodb
      .transactWrite({
        TransactItems: [{
          Put: {
            TableName: process.env.GLOBAL_TABLE as string,
            Item: invitation.data
          }
        }]
      })
      .promise();
  } catch (error) {
    console.log("\x1b[31m Error attempting to create invitation");
    throw error;
  }
};

export const roleGenerator = async (data?: Partial<Role>) => {
  try {
    const id = data?.id ?? faker.string.uuid();
    const tenantId = data?.tenantId ?? faker.string.uuid();

    const role = new Role(
      id,
      tenantId,
      data?.name ?? "MEMBER_ROLE",
      data?.scope ?? ScopeEnum.MEMBER
    );

    return dynamodb
      .transactWrite({
        TransactItems: [{
          Put: {
            TableName: process.env.GLOBAL_TABLE as string,
            Item: role.data
          }
        }]
      })
      .promise();
  } catch (error) {
    console.log("\x1b[31m Error attempting to create role");
    throw error;
  }
};