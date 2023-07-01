import { expressionAttributeNames, expressionAttributeValues, updateExpression } from "@utils";

import { TenantTierType, UpdateTenantParams } from "../type";
import { ddbDocument as dynamodb } from "../core/aws-client";

export class Tenant {
  constructor(
    readonly id: string,
    readonly adminEmail: string,
    readonly subDomain: string,
    readonly name: string,
    readonly tier: TenantTierType,
    readonly createdAt: string,
  ) { }

  // TODO: implement gid

  get PK() {
    return "TENANT";
  }

  get SK() {
    return `TENANT#${this.id}`;
  }

  get GSI2PK() {
    return `TENANT#SUBDOMAIN#${this.subDomain}`;
  }

  get GSI2SK() {
    return `TENANT#${this.name}`;
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
  static async getTenants(): Promise<Tenant[] | undefined> {
    const response = await dynamodb
      .query({
        TableName: process.env.GLOBAL_TABLE as string,
        KeyConditionExpression: "PK = :pk and begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": "TENANT",
          ":sk": "TENANT#",
        },
      })
      .promise();
    
    if (response.Items?.length) {
      return response.Items.map((tenant) => new Tenant(
        tenant.id as string,
        tenant.adminEmail as string,
        tenant.subDomain as string,
        tenant.name as string,
        tenant.tier as TenantTierType,
        tenant.createdAt as string
      ));
    }
    
    return undefined;
  }
  
  static async getById(id: string): Promise<Tenant | undefined> {
    const response = await dynamodb
      .query({
        TableName: process.env.GLOBAL_TABLE as string,
        KeyConditionExpression: "PK = :pk and SK = :sk",
        ExpressionAttributeValues: {
          ":pk": "TENANT",
          ":sk": `TENANT#${id}`,
        },
        Limit: 1,
      })
      .promise();
    
    if (response.Items?.length) {
      return new Tenant(
        response.Items[0].id as string,
        response.Items[0].adminEmail as string,
        response.Items[0].subDomain as string,
        response.Items[0].name as string,
        response.Items[0].tier as TenantTierType,
        response.Items[0].createdAt as string
      );
    }
    
    return undefined;
  }

  static async getBySubDomain(subDomain: string): Promise<Tenant | undefined> {
    const response = await dynamodb
      .query({
        IndexName: "GSI2",
        TableName: process.env.GLOBAL_TABLE as string,
        KeyConditionExpression: "GSI2PK = :GSI2PK and begins_with(GSI2SK, :GSI2SK)",
        ExpressionAttributeValues: {
          ":GSI2PK": `TENANT#SUBDOMAIN#${subDomain}`,
          ":GSI2SK": "TENANT#",
        },
        Limit: 1,
      })
      .promise();
    
    if (response.Items?.length) {
      return new Tenant(
        response.Items[0].id as string,
        response.Items[0].adminEmail as string,
        response.Items[0].subDomain as string,
        response.Items[0].name as string,
        response.Items[0].tier as TenantTierType,
        response.Items[0].createdAt as string
      );
    }
    
    return undefined;
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

  async update(params: UpdateTenantParams) {

    const newData = params?.name
      ? {
        ...params,
        GSI2SK: `TENANT#${params.name}`
      } : params;

    return dynamodb.update({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: "TENANT",
        SK: `TENANT#${this.id}`
      },
      ReturnValues: "ALL_NEW",
      UpdateExpression: updateExpression(newData),
      ConditionExpression: "attribute_exists(PK) and attribute_not_exists(dynamotorLegacy)",
      ExpressionAttributeNames: expressionAttributeNames(newData),
      ExpressionAttributeValues: expressionAttributeValues(newData)
    }).promise();
  }

  async delete() {
    return dynamodb.delete({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: "TENANT",
        SK: `TENANT#${this.id}`
      },
    }).promise();
  }
}
