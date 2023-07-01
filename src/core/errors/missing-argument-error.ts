export class MissingArgumentError extends Error {
  constructor(argument: string) {
    super(`Missing Argument: ${argument}`);
    this.name = "MissingArgumentError";
  }
}
