import { expressionAttributeNames, expressionAttributeValues, updateExpression } from "@utils";
import { UpdateUserParams } from "@type";

import { ddbDocument as dynamodb } from "../core/aws-client";

export class User {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly roleId: string,
    readonly givenName: string,
    readonly familyName: string,
    readonly email: string,
    readonly createdAt: string,
    readonly resetPassword: boolean
  ) { }

  // TODO: implement gid
  
  get PK() {
    return `TENANT#${this.tenantId}`;
  }

  get SK() {
    return `USER#${this.id}`;
  }

  get GSI2PK() {
    return `USER#EMAIL#${this.email}`;
  }

  get GSI2SK() {
    return `USER#${this.id}#TENANT#${this.tenantId}`;
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

  static async getByTenantId(tenantId: string): Promise<User[] | undefined> {
    const response = await dynamodb
      .query({
        TableName: process.env.GLOBAL_TABLE as string,
        KeyConditionExpression: "PK = :PK and begins_with(SK, :SK)",
        ExpressionAttributeValues: {
          ":PK": `TENANT#${tenantId}`,
          ":SK": "USER#",
        },
      })
      .promise();
        
    if (response.Items?.length) {
      return response.Items.map((user) => new User(
        user.id as string,
        user.tenantId as string,
        user.roleId as string,
        user.givenName as string,
        user.familyName as string,
        user.email as string,
        user.createdAt as string,
        user.resetPassword as boolean
      )); 
    }
    
    return undefined;
  }

  static async getById(tenantId: string, id: string): Promise<User | undefined> {
    const response = await dynamodb
      .get({
        TableName: process.env.GLOBAL_TABLE as string,
        Key: {
          "PK": `TENANT#${tenantId}`,
          "SK": `USER#${id}`,
        },
      })
      .promise();
    
    return response.Item ? new User(
        response.Item.id as string,
        response.Item.tenantId as string,
        response.Item.roleId as string,
        response.Item.givenName as string,
        response.Item.familyName as string,
        response.Item.email as string,
        response.Item.createdAt as string,
        response.Item.resetPassword as boolean
    ) : undefined;
  }
  
  static async getByEmail(email: string, userId?: string): Promise<User | undefined> {
    const response = await dynamodb
      .query({
        IndexName: "GSI2",
        TableName: process.env.GLOBAL_TABLE as string,
        KeyConditionExpression: "GSI2PK = :GSI2PK and begins_with(GSI2SK, :GSI2SK)",
        ExpressionAttributeValues: {
          ":GSI2PK": `USER#EMAIL#${email}`,
          ":GSI2SK": userId ? `USER#${userId}#TENANT#` : "USER#",
        },
        Limit: 1,
      })
      .promise();
        
    if (response.Items?.length) {
      return new User(
        response.Items[0].id as string,
        response.Items[0].tenantId as string,
        response.Items[0].roleId as string,
        response.Items[0].givenName as string,
        response.Items[0].familyName as string,
        response.Items[0].email as string,
        response.Items[0].createdAt as string,
        response.Items[0].resetPassword as boolean
      );
    }
    
    return undefined;
  }

  async put() {
    return dynamodb.put({
      TableName: process.env.GLOBAL_TABLE as string,
      Item: this.data
    }).promise();
  }

  async delete() {
    return dynamodb.delete({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: this.PK,
        SK: this.SK
      }
    }).promise();
  }

  async update(params: UpdateUserParams) {

    const newData = params?.email ? {
      ...params,
      GSI2PK: `USER#EMAIL#${params.email}`,
    } : params;

    return dynamodb.update({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: `TENANT#${this.tenantId}`,
        SK: `USER#${this.id}`
      },
      ReturnValues: "ALL_NEW",
      UpdateExpression: updateExpression(newData),
      ConditionExpression: "attribute_exists(PK) and attribute_not_exists(dynamotorLegacy)",
      ExpressionAttributeNames: expressionAttributeNames(newData),
      ExpressionAttributeValues: expressionAttributeValues(newData)
    }).promise();
  }
}