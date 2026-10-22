import { expect, test } from '@playwright/test';

test('El registro crea un usuario', { tag: '@smoke' }, async ({ request, baseURL }) => {
  const email = `sdet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ecommerce.test`;
  const response = await request
    .post('/api/v1/auth/register', {
      data: {
        nombre: 'Prueba Sdet',
        email,
        password: 'Passw0rd!123',
      },
    })
    .catch((error: Error) => {
      throw new Error(`No se pudo conectar al gateway en ${baseURL}. ${error.message}`);
    });

  const body = await response.text();
  const context = `POST ${response.url()} → ${response.status()}\n${body}`;
  const json = JSON.parse(body);

  expect(response.status(), `El registro no respondió 201.\n${context}`).toBe(201);
  expect(response.headers()['content-type'], context).toMatch(/application\/json/);
  expect(json, context).toMatchObject({ email, rol: 'USER' });
  expect(typeof json.userId, context).toBe('number');
  expect(typeof json.token, context).toBe('string');
  expect(json.token.length, context).toBeGreaterThan(0);
});
