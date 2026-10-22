import { expect, test } from '@playwright/test';

test.describe('pedidos', () => {
  test('Un pedido sin token recibe 401', { tag: '@smoke' }, async ({ request, baseURL }) => {
    const response = await request.get('/api/v1/pedido').catch((error: Error) => {
      throw new Error(`No se pudo conectar al gateway en ${baseURL}. ${error.message}`);
    });

    const body = await response.text();
    const context = `GET ${response.url()} → ${response.status()}\n${body}`;
    const json = JSON.parse(body);

    expect(response.status(), `El pedido no respondió 401.\n${context}`).toBe(401);
    expect(response.headers()['content-type'], context).toMatch(/application\/json/);
    expect(json, context).toMatchObject({
      status: 401,
      error: 'Unauthorized',
      message: 'Falta el header Authorization Bearer',
    });
  });
});
