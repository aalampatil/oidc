export class AccountError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
