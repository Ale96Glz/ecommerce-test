import { APIRequestContext, APIResponse, expect, test } from '@playwright/test';

const pausaPorLimiteMs = 1100;

async function postIdentidad(
  request: APIRequestContext,
  path: string,
  data: Record<string, string>,
  baseURL: string | undefined,
): Promise<APIResponse> {
  const enviar = () =>
    request.post(path, { data }).catch((error: Error) => {
      throw new Error(`No se pudo conectar al gateway en ${baseURL}. ${error.message}`);
    });

  let response = await enviar();
  if (response.status() === 429) {
    await new Promise((resolve) => setTimeout(resolve, pausaPorLimiteMs));
    response = await enviar();
  }
  return response;
}

test.describe('identidad', () => {
  test('El registro crea un usuario', { tag: '@smoke' }, async ({ request, baseURL }) => {
    const email = `sdet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ecommerce.test`;
    const response = await postIdentidad(
      request,
      '/api/v1/auth/register',
      {
        nombre: 'Prueba Sdet',
        email,
        password: 'Passw0rd!123',
      },
      baseURL,
    );

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

  test('El inicio de sesión devuelve un token', { tag: '@smoke' }, async ({ request, baseURL }) => {
    const email = `sdet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ecommerce.test`;
    const password = 'Passw0rd!123';

    const registro = await postIdentidad(
      request,
      '/api/v1/auth/register',
      { nombre: 'Prueba Sdet', email, password },
      baseURL,
    );
    expect(registro.status(), 'El usuario de la prueba no se pudo registrar.').toBe(201);

    const response = await postIdentidad(request, '/api/v1/auth/login', { email, password }, baseURL);
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

  test('Una contraseña incorrecta recibe 401', { tag: '@smoke' }, async ({ request, baseURL }) => {
    const email = `sdet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ecommerce.test`;
    const password = 'Passw0rd!123';

    const registro = await postIdentidad(
      request,
      '/api/v1/auth/register',
      { nombre: 'Prueba Sdet', email, password },
      baseURL,
    );
    expect(registro.status(), 'El usuario de la prueba no se pudo registrar.').toBe(201);

    const response = await postIdentidad(
      request,
      '/api/v1/auth/login',
      { email, password: 'clave-mala' },
      baseURL,
    );
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

  test('Un usuario no puede crear una categoría', { tag: '@security' }, async ({ request, baseURL }) => {
    const email = `sdet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ecommerce.test`;
    const password = 'Passw0rd!123';

    const registro = await postIdentidad(
      request,
      '/api/v1/auth/register',
      { nombre: 'Prueba Sdet', email, password },
      baseURL,
    );
    expect(registro.status(), 'El usuario de la prueba no se pudo registrar.').toBe(201);

    const login = await postIdentidad(request, '/api/v1/auth/login', { email, password }, baseURL);
    expect(login.status(), 'El usuario de la prueba no pudo iniciar sesión.').toBe(200);
    const token = JSON.parse(await login.text()).token as string;

    const response = await request.post('/api/v1/categoria', {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombre: 'Sdet Cat', descripcion: 'Prueba' },
    });
    const body = await response.text();
    const context = `POST ${response.url()} → ${response.status()}\n${body}`;
    const json = JSON.parse(body);

    expect(response.status(), `La categoría no respondió 403.\n${context}`).toBe(403);
    expect(response.headers()['content-type'], context).toMatch(/application\/json/);
    expect(json, context).toMatchObject({
      status: 403,
      error: 'Forbidden',
      message: 'Se requiere rol ADMIN',
    });
  });
});
