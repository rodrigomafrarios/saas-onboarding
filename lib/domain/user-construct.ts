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

interface UserConstructProps {
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

export class UserConstruct extends Construct {

  readonly completeSignupHandler: NodejsFunction;

  readonly forgotPasswordHandler: NodejsFunction;

  readonly resetPasswordHandler: NodejsFunction;

  readonly updateUserHandler: NodejsFunction;

  readonly deleteUserHandler: NodejsFunction;

  readonly loadUserHandler: NodejsFunction;

  readonly listUsersHandler: NodejsFunction;

  readonly meHandler: NodejsFunction;

  constructor(scope: Construct, id: string, props: UserConstructProps) {
    super(scope, id);

    const { globalTable, onboardingApi, adminRoutes, apiRoutes, authorizer, userPool } = props;

    this.completeSignupHandler = new NodejsFunction(this, "CompleteSignup", {
      entry: path.join(
        __dirname,
        "../../src/handler/user/complete-signup.ts"
      ),
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      handler: "completeSignupHandler",
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        USERPOOL: userPool.userPoolId
      }
    });

    this.completeSignupHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cognito-idp:AdminCreateUser"],
        resources: [userPool.userPoolArn]
      })
    );

    const completeSignUpRequestModel = onboardingApi.addModel("CompleteSignUpRequestModel", {
      modelName: "CompleteSignUpModel",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          hash: {
            type: JsonSchemaType.STRING
          },
          invitee: {
            type: JsonSchemaType.STRING
          },
          user: {
            type: JsonSchemaType.OBJECT,
            properties: {
              givenName: {
                type: JsonSchemaType.STRING
              },
              familyName: {
                type: JsonSchemaType.STRING
              }
            }
          },
        },
        required: ["hash", "invitee", "user"]
      }
    });

    apiRoutes
      .addResource("signup")
      .addMethod("PUT", new LambdaIntegration(this.completeSignupHandler), {
        authorizationType: AuthorizationType.NONE,
        requestModels: {
          "application/json": completeSignUpRequestModel
        },
        requestValidator: new RequestValidator(this, "CompleteSignUpRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "CompleteSignUpRequestValidator",
          validateRequestBody: true,
        })
      });
    
    this.forgotPasswordHandler = new NodejsFunction(this, "ForgotPassword", {
      entry: path.join(
        __dirname,
        "../../src/handler/auth/forgot-password.ts"
      ),
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      handler: "forgotPasswordHandler",
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
      }
    });

    this.forgotPasswordHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: [
          `arn:aws:ses:${props.env.region}:${props.env.account}:configuration-set/${Config.configSetName}`,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          `arn:aws:ses:${props.env.region}:${props.env.account}:identity/${Config.onboardingDomain as string}`,
        ],
      })
    );

    apiRoutes
      .addResource("forgot-password")
      .addMethod("POST", new LambdaIntegration(this.forgotPasswordHandler), {
        authorizationType: AuthorizationType.NONE,
        requestValidator: new RequestValidator(this, "ForgotPasswordRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "ForgotPasswordRequestValidator",
          validateRequestBody: true,
        })
      });
    
    this.resetPasswordHandler = new NodejsFunction(this, "ResetPassword", {
      entry: path.join(
        __dirname,
        "../../src/handler/auth/reset-password.ts"
      ),
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_18_X,
      handler: "resetPasswordHandler",
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        USERPOOL: userPool.userPoolId
      }
    });

    this.resetPasswordHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cognito-idp:AdminSetUserPassword"],
        resources: [userPool.userPoolArn]
      })
    );

    apiRoutes
      .addResource("reset-password")
      .addMethod("POST", new LambdaIntegration(this.resetPasswordHandler), {
        authorizationType: AuthorizationType.NONE,
        requestValidator: new RequestValidator(this, "ResetPasswordRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "ResetPasswordRequestValidator",
          validateRequestBody: true,
          validateRequestParameters: true,
        })
      });
    
    this.meHandler = new NodejsFunction(this, "Me", {
      entry: path.join(
        __dirname,
        "../../src/handler/user/me.ts"
      ),
      handler: "meHandler",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
      }
    });

    apiRoutes
      .addResource("me")
      .addMethod("GET", new LambdaIntegration(this.meHandler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
      });
    
    this.listUsersHandler = new NodejsFunction(this, "ListUsers", {
      entry: path.join(
        __dirname,
        "../../src/handler/user/list-users.ts"
      ),
      handler: "listUsersHandler",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
      }
    });

    adminRoutes
      .addResource("users")
      .addMethod("GET", new LambdaIntegration(this.listUsersHandler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
      });
        
    this.updateUserHandler = new NodejsFunction(this, "UpdateUser", {
      entry: path.join(
        __dirname,
        "../../src/handler/user/update-user.ts"
      ),
      handler: "updateUserHandler",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        USERPOOL: userPool.userPoolId
      }
    });

    this.updateUserHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
        ],
        resources: [userPool.userPoolArn]
      })
    );

    const updateUserRequestModel = onboardingApi.addModel("UpdateUserRequestModel", {
      modelName: "UpdateUserModel",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          givenName: {
            type: JsonSchemaType.STRING
          },
          familyName: {
            type: JsonSchemaType.STRING
          },
          email: {
            type: JsonSchemaType.STRING
          }
        },
      }
    });

    const userRoutesById = adminRoutes
      .addResource("user")
      .addResource("{id}");

    userRoutesById
      .addMethod("POST", new LambdaIntegration(this.updateUserHandler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
        requestModels: {
          "application/json": updateUserRequestModel
        },
        requestValidator: new RequestValidator(this, "UpdateUserRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "UpdateUserRequestValidator",
          validateRequestBody: true,
          validateRequestParameters: true    
        })
      });
    
    this.loadUserHandler = new NodejsFunction(this, "LoadUser", {
      entry: path.join(
        __dirname,
        "../../src/handler/user/load-user.ts"
      ),
      handler: "loadUserHandler",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
      }
    });

    userRoutesById
      .addMethod("GET", new LambdaIntegration(this.loadUserHandler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
        requestValidator: new RequestValidator(this, "LoadUserRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "LoadUserRequestValidator",
          validateRequestParameters: true    
        })
      });
    

    this.deleteUserHandler = new NodejsFunction(this, "DeleteUser", {
      entry: path.join(
        __dirname,
        "../../src/handler/user/delete-user.ts"
      ),
      handler: "deleteUserHandler",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        GLOBAL_TABLE: globalTable.tableName,
        USERPOOL: userPool.userPoolId
      }
    });

    this.deleteUserHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "cognito-idp:AdminDeleteUser",
        ],
        resources: [userPool.userPoolArn]
      })
    );

    userRoutesById
      .addMethod("DELETE", new LambdaIntegration(this.deleteUserHandler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
        requestValidator: new RequestValidator(this, "DeleteUserRequestValidator", {
          restApi: onboardingApi,
          requestValidatorName: "DeleteUserRequestValidator",
          validateRequestParameters: true    
        })
      });
  }
}