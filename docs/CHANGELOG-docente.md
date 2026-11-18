# CHANGELOG docente — ComercioConecta

Registro de cambios de requisito que imponga el docente (F4-B1).
Formato: impacto · decisión · qué cambia / qué no cambia · demo adaptación.

## Estado actual: sin cambio docente aplicado

El hueco `frontend/src/components/ChangeSlot.tsx` queda creado y aislado
(listo para recibir datos vía `props.data`), pero **el cambio de requisito
todavía no está definido**. Cuando llegue, se documenta en la sección
siguiente y se implementa solo dentro de ChangeSlot.

### Impacto

- Alcance tocado: ninguno todavía. El hueco existe para que el cambio
  futuro no obligue a reescribir `Panel`, `NetworkCanvas` ni `recommender.py`.
- Archivos que SÍ se tocarían al aplicar el cambio: únicamente
  `frontend/src/components/ChangeSlot.tsx` (y este documento).
- Archivos que NO se tocan: núcleo del grafo (`graph.py`, `algorithms.py`,
  `recommender.py`), routers, acceptance F1-F3 ni la lógica del panel.

### Decisión

- Aislamiento por componente: el cambio se enchufa en `ChangeSlot` con
  contrato mínimo `props: { data: any }`, sin lógica de grafo ni llamadas
  a la API en el hueco.
- Cualquier cambio que altere semántica de grafo, códigos HTTP o la regla
  F3 exige ADR propio antes de implementarse (regla del plan).

### Qué cambia / qué no cambia

| Qué cambia | Qué no cambia |
|---|---|
| (pendiente del cambio docente) | Grafo no-dirigido simétrico, peso = frecuencia `int>0`, códigos 201/409/404/422, regla F3 con `reason`, BFS propio sin NetworkX, fetch real sin mocks |

### Demo adaptación

- Con el hueco vacío la demo F4 no cambia: registra → consulta → propone.
- Al aplicar el cambio, la línea de demo que se ajuste queda descrita aquí
  junto con su verificación (comando + salida).

---

## Registro de cambios (llenar con cada cambio)

| Fecha | Cambio | Impacto | ADR | Verificación |
|---|---|---|---|---|
| — | — | — | — | — |
