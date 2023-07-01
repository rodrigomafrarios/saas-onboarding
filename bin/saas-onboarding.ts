#!/usr/bin/env node
import "source-map-support/register";

import * as cdk from "aws-cdk-lib";

import { SaasOnboardingStack } from "../lib/saas-onboarding-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { AuthStack } from "../lib/auth-stack";

const app = new cdk.App();

const defaultEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION 
};

const { userPool } = new AuthStack(app, "SaasAuthStack", { env: defaultEnv });

// this stack deploys an example of a website.
const { distribution } = new FrontendStack(app, "FrontendStack", { env: defaultEnv });

new SaasOnboardingStack(app, "SaasOnboardingStack", {
  userPool,
  distribution,
  env: defaultEnv,
});
