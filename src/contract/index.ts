/**
 * The contract layer — what every producer and consumer of a test case agrees on.
 *
 * Nothing here imports Playwright, a browser, or a product. That is deliberate: a
 * backend suite, a mobile suite and the report pipeline all pass through this code, so
 * it must cost nothing to depend on.
 */
export * from './types';
export * from './errors';
export * from './validate';
export * from './translate';
export * from './testid';
export * from './from-excel';
export * from './convert-excel';
