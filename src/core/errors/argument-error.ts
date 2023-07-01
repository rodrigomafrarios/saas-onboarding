export class ArgumentError extends Error {
  constructor() {
    super("Something went wrong with the arguments provided.");
    this.name = "ArgumentError";
  }
}