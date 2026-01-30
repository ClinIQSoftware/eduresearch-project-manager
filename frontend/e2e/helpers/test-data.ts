export function generateTestUser() {
  const ts = Date.now();
  return {
    email: `e2e-test-${ts}@test-eduresearch.com`,
    password: 'TestPass1234',
    first_name: 'E2E',
    last_name: `Tester${ts}`,
  };
}
