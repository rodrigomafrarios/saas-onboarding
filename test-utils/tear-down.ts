import { dynamodb, sesClient } from "../src/core/aws-client";
import { Config } from "../config";

const down = async (): Promise<void> => {
  try {

    await Promise.all([
      dynamodb
        .deleteTable({ TableName: process.env.GLOBAL_TABLE as string })
        .promise(),
      sesClient.deleteConfigurationSet({
        ConfigurationSetName: Config.configSetName 
      }).promise()
    ]);

  } catch (error) {
    console.log("\x1b[31m Error attempting to delete resources", JSON.stringify(error, null, 2));
  }
};

export default down;