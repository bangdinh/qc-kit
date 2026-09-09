/**
 * The one error type the contract layer throws.
 *
 * Every message carries the JSON path of the offending field (`test_cases[0].steps[2]
 * .action`), because the input is usually machine-generated: "invalid test case" sends
 * someone reading a 12-case payload by eye, the path does not.
 */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}
