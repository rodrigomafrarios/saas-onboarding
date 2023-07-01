export class InvalidArgumentError extends Error {
  constructor(argument: string) {
    super(`Invalid Argument: ${argument}`);
    this.name = "InvalidArgumentError";
  }
}
