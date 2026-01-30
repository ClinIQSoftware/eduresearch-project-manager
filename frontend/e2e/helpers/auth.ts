export { generateTestUser } from './test-data';

const API_URL = process.env.E2E_API_URL || 'https://eduresearch-api.onrender.com/api';

export async function apiRegister(user: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
  return res.json();
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function apiRegisterAndLogin(user: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}): Promise<string> {
  await apiRegister(user);
  return apiLogin(user.email, user.password);
}
