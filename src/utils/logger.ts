import pretty from "pino-pretty";
import pino, { Logger } from "pino";

const stream = pretty({
  colorize: true
});

export const logger: Logger = pino({
  name: "saas-onboarding",
  stream
});