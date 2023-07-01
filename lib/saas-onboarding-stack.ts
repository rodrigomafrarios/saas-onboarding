import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { AttributeType, BillingMode, ProjectionType, Table } from "aws-cdk-lib/aws-dynamodb";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  AllowedMethods, CacheCookieBehavior, CacheHeaderBehavior, CachePolicy, CacheQueryStringBehavior,
  Distribution, OriginRequestCookieBehavior, OriginRequestHeaderBehavior, OriginRequestPolicy,
  ResponseHeadersPolicy, ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {
  AccessLogFormat, ApiKeySourceType, CognitoUserPoolsAuthorizer, Cors, LogGroupLogDestination,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { CfnOutput, Duration, RemovalPolicy, SecretValue, Stack, StackProps } from "aws-cdk-lib";

import { InvitationConstruct, TenantConstruct, UserConstruct } from "./domain";
import { Config } from "../config";

export interface SaasOnboardingStackProps extends StackProps {
  userPool: UserPool
  distribution: Distribution
}

export class SaasOnboardingStack extends Stack {

  readonly onboardingApi: RestApi;
  
  readonly authorizer: CognitoUserPoolsAuthorizer;

  readonly globalTable: Table;

  constructor(scope: Construct, id: string, props: SaasOnboardingStackProps) {
    super(scope, id, props);

    const { userPool, distribution } = props;

    this.authorizer = new CognitoUserPoolsAuthorizer(this, "CognitoUserPoolsAuthorizer", {
      cognitoUserPools: [userPool]
    });

    /**
     * Single Table Design
     */

    this.globalTable = new Table(this, "globalTable", {
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    
    // Inverse Index
    this.globalTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "SK", type: AttributeType.STRING },
      sortKey: { name: "PK", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
    
    // GSI2
    this.globalTable.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // GSI3
    this.globalTable.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    /**
     * This is a suggestion to create the ACM Certificate and put the ARN as a secret.
     */
    new Secret(this, "globalSaasCertificate", {
      secretName: "saas-global-acm-certificate",
      secretStringValue: SecretValue.unsafePlainText("arn:aws:acm:us-east-1:xxxxxxxxxx1:certificate/certificate-id"),
    });

    const logGroup = new LogGroup(this, "OnboardingApiAccess");

    this.onboardingApi = new RestApi(this, "OnboardingApi", {
      apiKeySourceType: ApiKeySourceType.HEADER,
      cloudWatchRole: true,
      deployOptions: {
        stageName: Config.stage,
        accessLogDestination: new LogGroupLogDestination(logGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
      // FIXME: in real world origin, headers, methods should be specified
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS
      }
    });

    distribution.addBehavior("/api/v1/*", new HttpOrigin(
      `${this.onboardingApi.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
      {
        originPath: `/${this.onboardingApi.deploymentStage.stageName}`,
      }
    ), {
      viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: new CachePolicy(this, "CachePolicy", {
        minTtl: Duration.seconds(0),
        maxTtl: Duration.seconds(1),
        defaultTtl: Duration.seconds(0),
        cookieBehavior: CacheCookieBehavior.none(),
        queryStringBehavior: CacheQueryStringBehavior.all(),
        headerBehavior: CacheHeaderBehavior.allowList("Authorization"),
      }),
      responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
      originRequestPolicy: new OriginRequestPolicy(
        this,
        "ApiPolicy",
        {
          cookieBehavior: OriginRequestCookieBehavior.all(),
          headerBehavior:
            OriginRequestHeaderBehavior.allowList(
              "Origin",
              "Accept",
              "Access-Control-Request-Method",
              "Access-Control-Request-Headers",
              "Access-Control-Allow-Origin",
              "Access-Control-Allow-Methods"
            ),
        }
      )
    });

    const apiRoutes = this.onboardingApi.root
      .addResource("api")
      .addResource("v1");

    const adminRoutes = apiRoutes.addResource("admin");

    const constructByDomainProps = {
      globalTable: this.globalTable,
      onboardingApi: this.onboardingApi,
      adminRoutes,
      apiRoutes,
      authorizer: this.authorizer,
      userPool,
      env: {
        account: this.account,
        region: this.region 
      }
    };

    const { sendInvitationHandler } = new InvitationConstruct(this, "InvitationConstruct", constructByDomainProps);

    const { 
      registerTenantHandler,
      updateTenantHandler,
      deleteTenantHandler,
      loadTenantHandler,
    } = new TenantConstruct(this, "TenantConstruct", constructByDomainProps);

    const { 
      completeSignupHandler,
      updateUserHandler,
      deleteUserHandler,
      meHandler,
      loadUserHandler,
      listUsersHandler,
      forgotPasswordHandler,
      resetPasswordHandler
    } = new UserConstruct(this, "UserConstruct", constructByDomainProps);

    // O(1)
    const handlers: NodejsFunction[] = [
      sendInvitationHandler,
      registerTenantHandler,
      updateTenantHandler,
      deleteTenantHandler,
      loadTenantHandler,
      completeSignupHandler,
      updateUserHandler,
      deleteUserHandler,
      meHandler,
      loadUserHandler,
      listUsersHandler,
      forgotPasswordHandler,
      resetPasswordHandler
    ];

    handlers.map((handler: NodejsFunction) => {
      this.globalTable.grantReadWriteData(handler);

      handler.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "dynamodb:Query"
          ],
          resources: [`${this.globalTable.tableArn}/index/*`]
        })
      );
    });

    new CfnOutput(this, "OnboardingApiName", {
      value: this.onboardingApi.restApiName
    });

    new CfnOutput(this, "globalName", {
      value: this.globalTable.tableName,
    });
    
  }
}
