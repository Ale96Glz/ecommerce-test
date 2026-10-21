# Plan de pruebas — API ecommerce

Caja negra contra el API Gateway del ecommerce, tag `v1.2.2`. El backend ya está publicado: un caso rojo se contrasta con el contrato y, si el API cambió, se reporta en el producto. Este repositorio no modifica el backend ni construye interfaz.

## 1. Método

Prueba guiada por riesgo sobre el comportamiento observable del gateway: estado HTTP y cuerpo JSON. Cada caso se escribe, se ejecuta contra la versión fijada y se afirma el contrato medido en esa versión.

Los casos se agrupan por la capacidad que ya expone el gateway: identidad, catálogo, pedidos, pagos y notificaciones.

## 2. Sistema bajo prueba

| Campo | Valor |
|---|---|
| Producto | Java 21, Spring Boot 3.3, microservicios detrás de un API Gateway |
| Código | https://github.com/Ale96Glz/microservices-ecommerce |
| Versión | `1.2.2` (tag `v1.2.2`), registrada en `api-version.txt` |
| Entrada | `BASE_URL`, por defecto `http://localhost:8080` |
| Contrato | Rutas `/api/v1/**` del gateway |

Servicios detrás del gateway: `auth` (8081), `catalogo` (8082), `pedidos` (8083), `pagos` (8084), `notificaciones` (8085). Las pruebas no llaman esos puertos.

Imágenes: `ghcr.io/ale96glz/microservices-ecommerce/<servicio>:1.2.2`.

Oráculo funcional en el producto:

- `docs/escenarios-de-compra.md`
- `docs/adr/ADR-0012-ci-y-smoke-test.md`

## 3. Qué cubre este repo

El producto ya cubre unidad, integración, contratos Kafka, el humo de release (saga, ADMIN por base de datos, reintento de pago y traza) y el análisis de imagen.

Este repo cubre el contrato HTTP, los negativos de acceso y una carga suave de laboratorio. No sustituye el humo de release ni la build Maven. Un tag `v*` del producto no depende de este repo.

## 4. Alcance

### Humo de contrato

En serie, sin base de datos ni Kafka:

1. `GET /actuator/health` → 200 y `status` UP.
2. `POST /api/v1/auth/register` → 201, email único, contraseña que cumpla las reglas del producto.
3. `POST /api/v1/auth/login` → 200, cuerpo con `token` y `rol` USER.
4. Ruta protegida sin `Authorization` → 401. La ruta es `GET /api/v1/pedido`. `GET /api/v1/producto` y `GET /api/v1/categoria` son públicos.
5. Login con contraseña incorrecta → el código que responda la `1.2.2`.

### Autorización

- Sin token → 401.
- Token inválido → 401.
- USER en una escritura de catálogo reservada a ADMIN → 403.
- Cuerpo de registro inválido → 400.
- Un segundo cobro → 409, solo si ese código existe en la `1.2.2`.

### Carga de laboratorio

`k6/health.js`: `GET /actuator/health`, 5 VUs, 30 s. Umbrales de error y p95 medidos contra la `1.2.2`. Health no pasa por el rate limit.

Login y catálogo sí están limitados (login y registro: 1 token/s y ráfaga de 5 por IP; el resto: 1 token/s y ráfaga de 20 por sujeto del JWT). Esos scripts van después, con pausa suficiente para no tomar un 429 como fallo de rendimiento.

### Usuario de punta a punta

Registro, login, lectura de catálogo y 403 al escribir una categoría. Sin promover ADMIN y sin la saga.

El flujo de compra con producto, pedido, pago `PROCESADO` y notificación lo cubre el humo del producto.

### Integración continua

Cada push comprueba el TypeScript. El humo corre solo si hay un `BASE_URL` real. Sin sistema bajo prueba el job no falla.

## 5. Reglas de un caso

- Un comportamiento por test. El tag va en la opción `tag` de Playwright (`@smoke`, `@security`), no en el título.
- Email `sdet-<epoch>-<aleatorio>@ecommerce.test`. Sin estado compartido entre tests.
- Se afirma estado y forma del JSON. En el 401 del gateway: `status`, `error`, `message`. En el login: `token` y `rol`.
- El código HTTP se confirma en la `1.2.2` antes de dejarlo fijo.
- Playwright: fixture `request`, `baseURL` desde `BASE_URL`, un proyecto `api`, `workers: 1`. Sin navegadores.
- k6 de health declara en el resultado que la cifra es de laboratorio.

## 6. Entorno

| Variable | Valor inicial |
|---|---|
| `BASE_URL` | `http://localhost:8080` |
| `API_VERSION` | contenido de `api-version.txt` |
| `K6_VUS` | `5` |
| `K6_DURATION` | `30s` |

El stack es el Compose del producto con `IMAGE_VERSION=1.2.2`. La corrida empieza cuando `GET /actuator/health` responde 200. Un tag nuevo del producto actualiza `api-version.txt` y obliga a repetir los casos.

## 7. Herramientas

| Pieza | Elección |
|---|---|
| Funcional | Playwright Test, fixture `request`, TypeScript, Node 22 o superior |
| Navegadores | No se instalan |
| Carga | k6 |

## 8. Cierre

- Humo verde en local contra `1.2.2`.
- Al menos cuatro casos de autorización.
- Un k6 de health con umbrales medidos.
- CI de tipos en cada pull request, sin fallo por falta de localhost.
- Ningún navegador en el pipeline.

## 9. Fuera de alcance

- UI, Cypress o Selenium.
- Reescribir el humo de saga, el acceso a base de datos o las aserciones de traza.
- Cluster en cada pull request.
- Carga hasta agotar Postgres o Kafka.
- Cambiar el producto para hacer pasar un caso.
- Umbral de cobertura, validación OpenAPI y Pact: el producto ya los cubre.
