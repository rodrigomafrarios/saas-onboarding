import { Scope, ScopeEnum } from "@type";
import { ddbDocument as dynamodb } from "@core/aws-client";

export class Role {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly name: string,
    readonly scope: Scope
  ) { }

  get PK() {
    return `TENANT#${this.tenantId}`;
  }

  get SK() {
    return `ROLE#${this.id}`;
  }

  get GSI2PK() {
    return `TENANT#${this.tenantId}`;
  }

  get GSI2SK() {
    return this.scope === ScopeEnum.ADMIN
      ? "ROLE#SCOPE#ADMIN"
      : "ROLE#SCOPE#MEMBER";
  }

  get data() {
    return {
      ...this,
      PK: this.PK,
      SK: this.SK,
      GSI2PK: this.GSI2PK,
      GSI2SK: this.GSI2SK,
    };
  }
  
  async put() {
    return dynamodb
      .transactWrite({
        TransactItems: [{
          Put: {
            TableName: process.env.GLOBAL_TABLE as string,
            Item: this.data
          }
        }]
      })
      .promise();
  }

  static async getByTenantId(tenantId: string, isUserAdmin: boolean) {
    const response = await dynamodb
      .query({
        IndexName: "GSI2",
        TableName: process.env.GLOBAL_TABLE as string,
        KeyConditionExpression: "GSI2PK = :GSI2PK and GSI2SK = :GSI2SK",
        ExpressionAttributeValues: {
          ":GSI2PK": `TENANT#${tenantId}`,
          ":GSI2SK": isUserAdmin ? "ROLE#SCOPE#ADMIN" : "ROLE#SCOPE#MEMBER",
        },
        Limit: 1,
      })
      .promise();

    if (response.Items?.length) {
      return new Role(
        response.Items[0].id as string,
        response.Items[0].tenantId as string,
        response.Items[0].name as string,
        response.Items[0].scope as Scope,
      );
    }
    
    return undefined;
  }

  static async getById(tenantId: string, id: string) {
    const response = await dynamodb
      .get({
        TableName: process.env.GLOBAL_TABLE as string,
        Key: {
          "PK": `TENANT#${tenantId}`,
          "SK": `ROLE#${id}`
        }
      })
      .promise();
    
    const role = response.Item ?? undefined;
    
    return role ? new Role(
        role.id as string,
        role.tenantId as string,
        role.name as string,
        role.scope as Scope,
    ) : undefined;
  }
}