import { expect, test } from '@playwright/test';

test('El inicio de sesión devuelve un token', { tag: '@smoke' }, async ({ request, baseURL }) => {
  const email = `sdet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ecommerce.test`;
  const password = 'Passw0rd!123';

  const registro = await request
    .post('/api/v1/auth/register', {
      data: { nombre: 'Prueba Sdet', email, password },
    })
    .catch((error: Error) => {
      throw new Error(`No se pudo conectar al gateway en ${baseURL}. ${error.message}`);
    });
  expect(registro.status(), 'El usuario de la prueba no se pudo registrar.').toBe(201);

  const response = await request.post('/api/v1/auth/login', {
    data: { email, password },
  });
  const body = await response.text();
  const context = `POST ${response.url()} → ${response.status()}\n${body}`;
  const json = JSON.parse(body);

  expect(response.status(), `El login no respondió 200.\n${context}`).toBe(200);
  expect(response.headers()['content-type'], context).toMatch(/application\/json/);
  expect(json, context).toMatchObject({ email, rol: 'USER' });
  expect(typeof json.userId, context).toBe('number');
  expect(typeof json.token, context).toBe('string');
  expect(json.token.length, context).toBeGreaterThan(0);
});
