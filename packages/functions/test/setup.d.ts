declare global {
    namespace Viest {
        interface Assertion<T = any> {
            toBeSuccess(): void;
            toBeFailure(): void;
        }
    }
}
export {};
