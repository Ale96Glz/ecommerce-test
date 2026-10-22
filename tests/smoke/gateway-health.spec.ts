import { expect, test } from '@playwright/test';

test.describe('gateway', () => {
  test('El gateway responde health', { tag: '@smoke' }, async ({ request, baseURL }) => {
    const response = await request.get('/actuator/health').catch(() => {
      throw new Error(`No se pudo conectar al gateway en ${baseURL}.`);
    });
    expect(response.status(), 'El gateway no respondió 200.').toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/);
    expect(await response.json(), 'El health no está UP.').toMatchObject({ status: 'UP' });
  });
});
