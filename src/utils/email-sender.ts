import { EmailProps } from "@type";
import { sesClient } from "@core/aws-client";
import Config from "@config";

export const emailSender = async (emailProps: EmailProps) => {
  const { subject, message, to } = emailProps;
  
  return sesClient.sendEmail({
    ConfigurationSetName: process.env.CONFIG_SET_NAME,
    Source: Config.emailSender ,
    Destination: {
      ToAddresses: to
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: message
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject
      }
    }
  })
    .promise();
};