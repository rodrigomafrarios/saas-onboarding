import CognitoIdentityServiceProvider from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Credentials, DynamoDB, SES } from "aws-sdk";

const params = process.env.LOCALSTACK_ENDPOINT
  ? {
    endpoint: process.env.LOCALSTACK_ENDPOINT,
    credentials: new Credentials("000000000000", "na")
  } : {};

export const dynamodb = new DynamoDB(params);

export const ddbDocument = new DynamoDB.DocumentClient(params);

export const sesClient = new SES(params);

export const cognito = new CognitoIdentityServiceProvider(params);