import path from "path";
import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption, HttpMethods, ObjectOwnership,
  RedirectProtocol, ReplaceKey
} from "aws-cdk-lib/aws-s3";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  AllowedMethods, CacheCookieBehavior, CacheHeaderBehavior, CachePolicy, CacheQueryStringBehavior,
  Distribution, HeadersFrameOption, HeadersReferrerPolicy, OriginAccessIdentity,
  OriginRequestPolicy, OriginRequestQueryStringBehavior, ResponseHeadersPolicy, ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";

import { Config } from "../config";

export class FrontendStack extends Stack {

  readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const website = new Bucket(this, "SaasOnboardingBucket", {
      accessControl: BucketAccessControl.PRIVATE,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      cors: [{
        allowedMethods: [
          HttpMethods.GET,
          HttpMethods.HEAD,
          HttpMethods.POST,
          HttpMethods.DELETE,
          HttpMethods.PUT
        ],
        allowedOrigins: ["*"],
        allowedHeaders: ["*"]
      }],
      websiteIndexDocument: "index.html",
      websiteRoutingRules: [{
        condition: {
          httpErrorCodeReturnedEquals: "404"
        },
        replaceKey: ReplaceKey.prefixWith("#!/"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        hostName: Config.onboardingDomain,
        protocol: RedirectProtocol.HTTPS
      }, {
        condition: {
          httpErrorCodeReturnedEquals: "403"
        },
        replaceKey: ReplaceKey.prefixWith("#!/"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        hostName: Config.onboardingDomain,
        protocol: RedirectProtocol.HTTPS
      }]
    });

    new BucketDeployment(this, "SaasOnboardingWebsiteDeployment", {
      destinationBucket: website,
      sources: [
        Source.asset(path.resolve(__dirname, "../frontend/build")),
      ]
    });

    const originAccessIdentity = new OriginAccessIdentity(this, "WebsiteOriginAccessIdentify");
    website.grantRead(originAccessIdentity);

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, "SecurityHeadersResponseHeaderPolicy", {
      securityHeadersBehavior: {
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: Duration.days(2 * 365),
          includeSubdomains: true,
          preload: true
        },
        contentTypeOptions: {
          override: true
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true
        },
        frameOptions: {
          override: true,
          frameOption: HeadersFrameOption.DENY
        }
      }
    });

    const hostedZone = HostedZone.fromLookup(this, "SaasOnboardingHostedZone", {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      domainName: Config.onboardingDomain,
    });

    const certificateArn = Secret.fromSecretNameV2(this, "globalTableSecret", "saas-global-acm-certificate");

    const cert = Certificate
      .fromCertificateArn(this,
        "SaasOnboardingCertificate",
        certificateArn.secretValue.unsafeUnwrap()
      );

    this.distribution = new Distribution(this, "OnboardingApiDistribution", {
      certificate: cert,
      domainNames: [Config.onboardingDomain],
      defaultBehavior: {
        origin: new S3Origin(website, { originAccessIdentity }),
        compress: true,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new CachePolicy(this, "CachePolicy", {
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(1),
          defaultTtl: Duration.seconds(0),
          cookieBehavior: CacheCookieBehavior.none(),
          queryStringBehavior: CacheQueryStringBehavior.all(),
          headerBehavior: CacheHeaderBehavior.allowList("Authorization"),
        }),
        responseHeadersPolicy,
        originRequestPolicy: new OriginRequestPolicy(this, "OriginPolicy", {
          queryStringBehavior: OriginRequestQueryStringBehavior.all(),
        })
      },
    });

    new ARecord(this, "ApiCloudfrontRecord", {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      recordName: Config.onboardingDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      zone: hostedZone,
    });

    this.distribution.grantCreateInvalidation(originAccessIdentity);

    new CfnOutput(this, "WebsiteBucketArn", {
      value: website.bucketArn
    });

    new CfnOutput(this, "CloudfrontURL", {
      value: this.distribution.distributionDomainName
    });
  }
}