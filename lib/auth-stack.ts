import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  AccountRecovery, ClientAttributes, OAuthScope, StringAttribute, UserPool, UserPoolClient,
  UserPoolClientIdentityProvider, UserPoolOperation
} from "aws-cdk-lib/aws-cognito";
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";

import path = require("path");

export class AuthStack extends Stack {
  readonly userPool: UserPool;

  readonly userPoolClient: UserPoolClient;

  readonly updateUserPoolClient: NodejsFunction;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.userPool = new UserPool(this, "UserPool", {
      autoVerify: {
        email: false,
        phone: false,
      },
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          mutable: true,
          required: true,
        },
      },
      customAttributes: {
        userId: new StringAttribute({ mutable: true }),
        tenantId: new StringAttribute({ mutable: true }),
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // const readOnlyScope = new ResourceServerScope({
    //   scopeName: "read",
    //   scopeDescription: "Read-only access"
    // })

    // const fullAccessScope = new ResourceServerScope({
    //   scopeName: "*",
    //   scopeDescription: "Full access"
    // })

    // this.userPool.addResourceServer("OnboardingServer", {
    //   identifier: "onboarding",
    //   scopes: [ readOnlyScope, fullAccessScope ]
    // })

    this.userPoolClient = new UserPoolClient(this, "userPoolClient", {
      userPool: this.userPool,
      preventUserExistenceErrors: false,
      refreshTokenValidity: Duration.days(1),
      writeAttributes: new ClientAttributes().withStandardAttributes({
        email: true,
      }),
      readAttributes: new ClientAttributes()
        .withStandardAttributes({
          email: true,
        })
        .withCustomAttributes(
          "custom:userId",
          "custom:tenantId",
        ),
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          OAuthScope.EMAIL,
          OAuthScope.PROFILE,
          OAuthScope.OPENID,
          OAuthScope.COGNITO_ADMIN,
        ],
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    const preSignUpHook = new NodejsFunction(this, "PreSignupHook", {
      entry: path.join(
        __dirname,
        "../src/handler/auth/pre-signup-trigger.ts"
      ),
      handler: "handler",
    });

    this.userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, preSignUpHook);

    new CfnOutput(this, "UserPoolOutput", {
      exportName: "UserPool",
      value: this.userPool.userPoolArn,
    });
    new CfnOutput(this, "UserPoolClientId", {
      exportName: "userPoolClientId",
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
