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

interface TenantConstructProps {
  globalTable: Table
  onboardingApi: RestApi
  adminRoutes: RestApi["root"]
  apiRoutes: RestApi["root"]
  authorizer: CognitoUserPoolsAuthorizer
  userPool: UserPool
  env: {
    account: string
    region: string
  }
}

export class TenantConstruct extends Construct {

  readonly registerTenantHandler: NodejsFunction;

  readonly updateTenantHandler: NodejsFunction;

  readonly deleteTenantHandler: NodejsFunction;

  readonly loadTenantHandler: NodejsFunction;

  constructor(scope: Construct, id: string, props: TenantConstructProps) {
    super(scope, id);

    const { globalTable, onboardingApi, adminRoutes, apiRoutes, authorizer, userPool } = props;

    this.registerTenantHandler = new NodejsFunction(this, "RegisterTenant", {
      entry: path.join(
        __dirname,
        "../../src/handler/tenant/register-tenant.ts"
      ),
      handler: "registerTenantHandler",
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        CONFIG_SET_NAME: Config.configSetName,
        EMAIL_SENDER: Config.emailSender
      }
    });

    this.registerTenantHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: [
          `arn:aws:ses:${props.env.region}:${props.env.account}:configuration-set/${Config.configSetName}`,
          `arn:aws:ses:${props.env.region}:${props.env.account}:identity/${Config.onboardingDomain }`
        ],
      })
    );

    const registerTenantRequestModel = onboardingApi.addModel("RegisterTenantRequestModel", {
      modelName: "RegisterTenantModel",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          adminEmail: {
            type: JsonSchemaType.STRING
          },
          subDomain: {
            type: JsonSchemaType.STRING
          },
          name: {
            type: JsonSchemaType.STRING
          },
          tier: {
            type: JsonSchemaType.STRING
          }
        },
        required: ["adminEmail", "subDomain", "name", "tier"]
      }
    });

    const tenantRoutes = apiRoutes.addResource("tenant");

    tenantRoutes
      .addMethod("PUT", new LambdaIntegration(this.registerTenantHandler), {
        authorizationType: AuthorizationType.NONE,
        requestModels: {
          "application/json": registerTenantRequestModel
        },
        requestValidator:
          new RequestValidator(this, "RegisterTenantRequestValidator", {
            restApi: onboardingApi,
            requestValidatorName: "RegisterTenantRequestValidator",
            validateRequestBody: true,
          })
      });
    
    const tenantRoutesById = adminRoutes
      .addResource("tenant")
      .addResource("{id}");
    
    this.updateTenantHandler = new NodejsFunction(this, "UpdateTenant", {
      entry: path.join(
        __dirname,
        "../../src/handler/tenant/update-tenant.ts"
      ),
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      handler: "updateTenantHandler",
      environment: {
        GLOBAL_TABLE: globalTable.tableName
      }
    });

    const updateTenantRequestModel = onboardingApi.addModel("UpdateTenantRequestModel", {
      modelName: "UpdateTenantModel",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: JsonSchemaType.STRING
          },
          tier: {
            type: JsonSchemaType.STRING
          },
          adminEmail: {
            type: JsonSchemaType.STRING
          }
        },
      }
    });
    
    tenantRoutesById
      .addMethod("POST", new LambdaIntegration(this.updateTenantHandler), {
        authorizer,
        authorizationType: AuthorizationType.COGNITO,
        requestModels: {
          "application/json": updateTenantRequestModel
        },
        requestValidator:
          new RequestValidator(this, "UpdateTenantRequestValidator", {
            restApi: onboardingApi,
            requestValidatorName: "UpdateTenantRequestValidator",
            validateRequestBody: true,
            validateRequestParameters: true
          })
      });
    
    this.deleteTenantHandler = new NodejsFunction(this, "DeleteTenant", {
      entry: path.join(
        __dirname,
        "../../src/handler/tenant/delete-tenant.ts"
      ),
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      handler: "deleteTenantHandler",
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        USERPOOL: userPool.userPoolId
      }
    });
    
    tenantRoutesById.addMethod("DELETE", new LambdaIntegration(this.deleteTenantHandler), {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator:
        new RequestValidator(this, "DeleteTenantRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "DeleteTenantRequestValidator",
          validateRequestParameters: true
        })
    });

    this.deleteTenantHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:ListUsers"
        ],
        resources: [userPool.userPoolArn]
      })
    );

    this.loadTenantHandler = new NodejsFunction(this, "LoadTenant", {
      entry: path.join(
        __dirname,
        "../../src/handler/tenant/load-tenant.ts"
      ),
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      handler: "loadTenantHandler",
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
      }
    });

    tenantRoutesById.addMethod("GET", new LambdaIntegration(this.loadTenantHandler), {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator:
        new RequestValidator(this, "LoadTenantRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "LoadTenantRequestValidator",
          validateRequestParameters: true
        })
    });
  }
}