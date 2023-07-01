import { FromEnum } from "./from-enum";

export enum ScopeEnum {
  ROOT = "root",
  ADMIN = "admin",
  MEMBER = "member"
}

export type Scope = FromEnum<typeof ScopeEnum>