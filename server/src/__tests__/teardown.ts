/**
 * __tests__/teardown.ts
 * Global Jest teardown — closes DB pools and Redis after all suites.
 */
export default async function globalTeardown(): Promise<void> {
  // Connections are torn down in individual test files
}
