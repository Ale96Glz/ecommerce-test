import { expect, test } from '@playwright/test';

test('El gateway responde health', { tag: '@smoke' }, async ({ request, baseURL }) => {
  const response = await request.get('/actuator/health').catch((error: Error) => {
    throw new Error(
      `No se pudo conectar al gateway en ${baseURL}.`,
    );
  });
  const body = await response.text();
  const context = `GET ${response.url()} → ${response.status()}\n${body}`;

  expect(response.status(), `El gateway no respondió 200.\n${context}`).toBe(200);
  expect(response.headers()['content-type']).toMatch(/json/);
  expect(JSON.parse(body), `El health no está UP.\n${context}`).toMatchObject({
    status: 'UP',
  });
});