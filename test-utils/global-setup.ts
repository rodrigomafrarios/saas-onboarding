import { dynamodb, sesClient } from "../src/core/aws-client";
import { Config } from "../config";

const createTable = async () => {
  return dynamodb.createTable({
    TableName: process.env.GLOBAL_TABLE as string,
    AttributeDefinitions: [
      {
        "AttributeName": "GSI2PK",
        "AttributeType": "S"
      },
      {
        "AttributeName": "GSI2SK",
        "AttributeType": "S"
      },
      {
        "AttributeName": "GSI3PK",
        "AttributeType": "S"
      },
      {
        "AttributeName": "GSI3SK",
        "AttributeType": "S"
      },
      {
        "AttributeName": "PK",
        "AttributeType": "S"
      },
      {
        "AttributeName": "SK",
        "AttributeType": "S"
      }
    ],
    KeySchema: [
      {
        "AttributeName": "PK",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "SK",
        "KeyType": "RANGE"
      }
    ],
    GlobalSecondaryIndexes: [
      {
        "IndexName": "GSI2",
        "KeySchema": [
          {
            "AttributeName": "GSI2PK",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "GSI2SK",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        }
      },
      {
        "IndexName": "GSI3",
        "KeySchema": [
          {
            "AttributeName": "GSI3PK",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "GSI3SK",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        }
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
    DeletionProtectionEnabled: false
  }).promise();
};

const up = async (): Promise<void> => {
  try {
    await Promise.all([
      createTable(),
      sesClient.createConfigurationSet({
        ConfigurationSet: {
          Name: Config.configSetName
        }
      }).promise()
    ]);
  } catch (error) {
    console.log("\x1b[31m Error attempting to create resources", JSON.stringify(error, null, 2));
  }
};

export default up;