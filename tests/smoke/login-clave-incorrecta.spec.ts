import { expect, test } from '@playwright/test';

test('Una contraseña incorrecta recibe 401', { tag: '@smoke' }, async ({ request, baseURL }) => {
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
    data: { email, password: 'clave-mala' },
  });
  const body = await response.text();
  const context = `POST ${response.url()} → ${response.status()}\n${body}`;
  const json = JSON.parse(body);

  expect(response.status(), `El login no respondió 401.\n${context}`).toBe(401);
  expect(response.headers()['content-type'], context).toMatch(/application\/json/);
  expect(json, context).toMatchObject({
    status: 401,
    error: 'Unauthorized',
    message: 'Credenciales invalidas',
  });
});
