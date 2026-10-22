import { expect, test } from '@playwright/test';

test.describe('pedidos', () => {
  test('Un pedido sin token recibe 401', { tag: '@smoke' }, async ({ request, baseURL }) => {
    const response = await request.get('/api/v1/pedido').catch((error: Error) => {
      throw new Error(`No se pudo conectar al gateway en ${baseURL}. ${error.message}`);
    });

    expect(response.status(), 'El pedido no respondió 401.').toBe(401);
    expect(response.headers()['content-type']).toMatch(/application\/json/);

    const json = await response.json();
    expect(json).toMatchObject({
      status: 401,
      error: 'Unauthorized',
      message: 'Falta el header Authorization Bearer',
    });
  });
});
