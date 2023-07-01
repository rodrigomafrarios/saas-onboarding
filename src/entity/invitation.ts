import { ddbDocument as dynamodb } from "@core/aws-client";

import { InvitationStatus } from "../type";

export class Invitation {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly invitee: string,
    readonly hashSecret: string,
    readonly status: InvitationStatus,
    readonly isUserAdmin: boolean,
    readonly sentAt: string,
    readonly expiresAt: string
  ) { }

  get PK() {
    return `INVITATION#${this.id}`;
  }

  get SK() {
    return `INVITATION#${this.id}`;
  }

  get GSI2PK() {
    return `INVITATION#EMAIL#${this.invitee}`;
  }

  get GSI2SK() {
    return `INVITATION#TENANT#${this.tenantId}`;
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

  static async getById(id: string) {
    return dynamodb.get({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: `INVITATION#${id}`,
        SK: `INVITATION#${id}`
      }
    }).promise();
  }

  static async getByEmail(invitee: string, tenant?: string) {
    const response = await dynamodb.query({
      IndexName: "GSI2",
      TableName: process.env.GLOBAL_TABLE as string,
      KeyConditionExpression: "GSI2PK = :GSI2PK and begins_with(GSI2SK, :GSI2SK)",
      ExpressionAttributeValues: {
        ":GSI2PK": `INVITATION#EMAIL#${invitee}`,
        ":GSI2SK": tenant ? `INVITATION#TENANT#${tenant}` : "INVITATION#TENANT#",
      },
      Limit: 1,
    })
      .promise();
    
    if (response.Items?.length) {
      return new Invitation(
        response.Items[0].id as string,
        response.Items[0].tenantId as string,
        response.Items[0].invitee as string,
        response.Items[0].hashSecret as string,
        response.Items[0].status as InvitationStatus,
        response.Items[0].isUserAdmin as boolean,
        response.Items[0].sentAt as string,
        response.Items[0].expiresAt as string
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

  static async updateStatus(id: string, status: InvitationStatus) {
    return dynamodb.update({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: `INVITATION#${id}`,
        SK: `INVITATION#${id}`
      },
      ReturnValues: "ALL_NEW",
      UpdateExpression: "SET #status = :status",
      ConditionExpression: "attribute_exists(PK) and attribute_not_exists(dynamotorLegacy)",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": status
      }
    }).promise();
  }

  async delete() {
    return dynamodb.delete({
      TableName: process.env.GLOBAL_TABLE as string,
      Key: {
        PK: `INVITATION#${this.id}`,
        SK: `INVITATION#${this.id}`
      },
    }).promise();
  }
}