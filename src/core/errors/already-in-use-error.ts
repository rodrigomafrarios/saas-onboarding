export class AlreadyInUseError extends Error {
  constructor(paramName: string) {
    super(`${paramName} already in use`);
    this.name = "AlreadyInUseError";
  }
}