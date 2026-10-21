# Pruebas del API ecommerce

Caja negra del gateway de [microservices-ecommerce](https://github.com/Ale96Glz/microservices-ecommerce), versión **1.2.2**. No hay interfaz. Todas las peticiones van a `BASE_URL` (`http://localhost:8080`); los puertos internos de los servicios no se usan.

El producto ya cubre la build y el humo de release. Este repositorio mira el contrato HTTP, el acceso y una carga corta de laboratorio. Los casos y el orden están en el [plan de pruebas](docs/plan-de-pruebas.md).

## Levantar el gateway

Desde el clon del producto, con las imágenes publicadas:

```powershell
$env:IMAGE_PREFIX = "ghcr.io/ale96glz/microservices-ecommerce"
$env:IMAGE_VERSION = "1.2.2"
docker compose pull postgres kafka zipkin redis auth-service catalogo-service pedidos-service pagos-service notificaciones-service api-gateway
docker compose up -d --wait --wait-timeout 180 --no-build postgres kafka zipkin redis auth-service catalogo-service pedidos-service pagos-service notificaciones-service api-gateway
```

La corrida puede empezar cuando `GET http://localhost:8080/actuator/health` responde 200.

## Variables

| Variable | Valor |
|---|---|
| `BASE_URL` | `http://localhost:8080` |
| `IMAGE_VERSION` | `1.2.2` |
| `K6_VUS` | `5` |
| `K6_DURATION` | `30s` |

`K6_VUS` y `K6_DURATION` valen para el health de laboratorio. Login y catálogo tienen límite de peticiones y no usan esos números.

## Límite de peticiones

El gateway cuenta con Redis. Login y registro permiten 1 petición por segundo y una ráfaga de 5 por IP. El resto permite 1 por segundo y una ráfaga de 20 por usuario. Las pruebas van en serie. Un 429 es el límite, no una caída del API. `/actuator/health` no entra en ese límite.

## Herramientas

Playwright Test, solo el cliente HTTP, en TypeScript. Node 22 o superior. No se instalan navegadores. La carga la hace k6 y el resultado es del laboratorio, no de un despliegue.

```powershell
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
npm ci
```
