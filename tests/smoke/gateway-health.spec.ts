import { expect, test } from '@playwright/test';

test('El gateway responde health', { tag: '@smoke' }, async ({ request }) => {
  const health = await request.get('/actuator/health');

  await expect(health).toBeOK();
  expect(health.headers()['content-type']).toContain(
    'application/vnd.spring-boot.actuator.v3+json',
  );
  expect(await health.json()).toMatchObject({ status: 'UP' });
});
