import path from "path";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import {
  AuthorizationType, CognitoUserPoolsAuthorizer, JsonSchemaType, LambdaIntegration,
  RequestValidator, RestApi
} from "aws-cdk-lib/aws-apigateway";
import { Duration } from "aws-cdk-lib";

import { Config } from "../../config";

interface InvitationConstructProps {
  globalTable: Table
  onboardingApi: RestApi
  apiRoutes: RestApi["root"]
  adminRoutes: RestApi["root"]
  authorizer: CognitoUserPoolsAuthorizer
  userPool: UserPool
  env: {
    account: string
    region: string
  }
}

export class InvitationConstruct extends Construct {

  readonly sendInvitationHandler: NodejsFunction;

  constructor(scope: Construct, id: string, props: InvitationConstructProps) {
    super(scope, id);

    const { globalTable, onboardingApi, authorizer, adminRoutes } = props;

    this.sendInvitationHandler = new NodejsFunction(this, "SendInvitation", {
      entry: path.join(
        __dirname,
        "../../src/handler/invitation/send-invitation.ts"
      ),
      handler: "sendInvitationHandler",
      timeout: Duration.seconds(8),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        CONFIG_SET_NAME: Config.configSetName,
        EMAIL_SENDER: Config.emailSender
      }
    });

    this.sendInvitationHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: [
          `arn:aws:ses:${props.env.region}:${props.env.account}:configuration-set/${Config.configSetName}`,
          `arn:aws:ses:${props.env.region}:${props.env.account}:identity/${Config.onboardingDomain }`,
        ],
      })
    );

    const sendInvitationRequestModel = onboardingApi.addModel("SendInvitationRequestModel", {
      modelName: "SendInvitationModel",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          invitee: {
            type: JsonSchemaType.STRING
          }
        },
        required: ["invitee"]
      }
    });

    adminRoutes
      .addResource("invitation")
      .addMethod("PUT", new LambdaIntegration(this.sendInvitationHandler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
        requestModels: {
          "application/json": sendInvitationRequestModel
        },
        requestValidator: new RequestValidator(this, "SendInvitationRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "SendInvitationRequestValidator",
          validateRequestBody: true
        })
      });
  }
}