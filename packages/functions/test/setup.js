"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Global test setup
const vitest_1 = require("vitest");
// Mock global implementations if needed
global.describe = describe;
global.it = it;
global.expect = expect;
global.vi = vitest_1.vi;
expect.extend({
    toBeSuccess(received) {
        const pass = received?._tag === 'Success';
        return {
            pass,
            message: () => `Expected ${received} to be a Success, but got ${received?._tag}`,
        };
    },
    toBeFailure(received) {
        const pass = received?._tag === 'Failure';
        return {
            pass,
            message: () => `Expected ${received} to be a Failure, but got ${received?._tag}`,
        };
    },
});
// Console mocking for tests
global.console = {
    ...console,
    // Suppress specific logs during tests
    log: vitest_1.vi.fn(),
    warn: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
};
