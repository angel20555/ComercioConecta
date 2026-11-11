# ComercioConecta

## Propósito

ComercioConecta es la red comercial de pymes de tiendas de barrio: registra productos que se compran juntos (datos 100% sintéticos, p. ej. `pan, leche, queso, café, arepa, chocolate`) y expone esa red vía API REST real consumida por un frontend. Grafo y algoritmos 100% propios (`dict[str, dict[str, float]]`, BFS propio); prohibido NetworkX para cómputo.

Plan de trabajo: `docs/superpowers/plans/2026-10-02-comercioconecta-f1-f4.md`. Bitácora IA: `docs/aiLog.md`.

## Estructura del monorepo

```text
backend/                 # FastAPI + Pydantic v2 + Uvicorn
  requirements.txt       # fastapi, pydantic v2, uvicorn
  app/
    __init__.py
    main.py              # FastAPI + CORS + GET /health + GET /
    graph.py             # ProductGraph real no-dirigido (F1)
    algorithms.py        # F2: bfs_reachable + connected_components propias (sin NetworkX)
    recommender.py       # F3: regla de propuesta a 2 saltos (sin ML)
    routers/             # products, relationships, network (F1) + explore (F2) + recommend (F3)
docs/
  aiLog.md               # bitácora IA (tabla Decisión|Herramienta|Propuesta|Acepté/Rechacé|Verificación)
  superpowers/plans/     # plan F1-F4
scripts/acceptance/      # scripts stdlib urllib: F1 (30/30), F2 (29/29) y F3 (25/25)
frontend/                # Vite React TS que consume el backend real
  src/api/client.ts      # apiGet<T>/apiPost<T> con API_BASE=http://127.0.0.1:8000 (sin mocks, sin lógica de grafo; timeout 8 s)
  src/App.tsx            # shell de rol/tema + estado real de /health
  src/components/        # Cliente: ClientShowcase + ProductPicker; Admin: Ledger, NetworkCanvas, Explorer, Recommend; RoleSwitch, ThemeToggle
  src/lib/preferences.ts # persistencia de tema (cc-theme) y rol (cc-role) en localStorage
```

## Instalación y ejecución

Backend (Python 3.12+):

```bash
cd backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (Vite React TS, ya integrado):

```bash
cd frontend
npm install
npm run dev -- --port 5173
npm run build
```

Aceptación (backend recién reiniciado en `http://127.0.0.1:8000`; cada script parte de grafo vacío):

```bash
python scripts/acceptance/acceptanceF1.py   # 30/30 PASS
python scripts/acceptance/acceptanceF2.py   # 29/29 PASS
python scripts/acceptance/acceptanceF3.py   # 25/25 PASS
python scripts/acceptance/acceptanceF4.py   # futuro
```

## Endpoints (verificado contra `backend/app/routers/` + `acceptanceF1.py` 30/30, `acceptanceF2.py` 29/29 y `acceptanceF3.py` 25/25)

Base T0 (sigue igual):

| Método | Ruta | OK | Errores |
|---|---|---|---|
| GET | `/health` | 200 `{"status":"ok"}` | — |
| GET | `/` | 200 `{"message":"ComercioConecta API — red comercial de tiendas de barrio"}` | — |

F1 Red comercial inicial (backend de A+B; UI ledger/canvas de C):

| Método | Ruta | OK | Errores |
|---|---|---|---|
| POST | `/products` | 201 `{"id"}` | 409 duplicado (con `strip()`), 422 id vacío |
| GET | `/products` | 200 `{"products":[...]}` (ordenados) | — |
| POST | `/relationships` | 201 `{"source","target","weight"}` | 404 producto inexistente, 422 self-loop/peso inválido (`<=0`, texto, `bool`), 409 duplicada en cualquier orden |
| GET | `/relationships` | 200 `{"relationships":[...]}` | — |
| GET | `/network` | 200 `{"nodes","edges","undirected":true}` | red vacía: 200 + `"message":"red vacía: cargue productos"` |

Notas F1: grafo en memoria (sin DB, se pierde al reiniciar); cada arista no-dirigida se devuelve una sola vez en orden canónico (`leche-pan`, no `pan-leche`); ruta inexistente (`GET /products/xxx`) → 404.

### Ejemplo guiado: pan-leche (wizard de códigos, verificado en vivo)

```bash
POST /products {"id":"pan"}                                    # 201 {"id":"pan"}
POST /products {"id":"leche"}                                  # 201 {"id":"leche"}
POST /relationships {"source":"pan","target":"leche","weight":3}  # 201 {"source":"pan","target":"leche","weight":3}
POST /relationships {"source":"leche","target":"pan","weight":3}  # 409 {"detail":"relación duplicada: 'leche'-'pan'"}
POST /relationships {"source":"pan","target":"bogus","weight":1}  # 404 {"detail":"producto inexistente: 'pan' o 'bogus'"}
POST /relationships {"source":"pan","target":"pan","weight":1}    # 422 {"detail":"relación inválida (self-loop): 'pan'-'pan'"}
GET /network  # 200 {"nodes":[{"id":"leche"},{"id":"pan"}],"edges":[{"source":"leche","target":"pan","weight":3}],"undirected":true}
```

F2 Exploración (backend de A sobre el núcleo BFS de B; UI de C):

| Método | Ruta | OK | Errores |
|---|---|---|---|
| GET | `/reachable?product=pan&depth=2` | 200 `{"product","depth","reachable":[{"id","distance"}]}`; `weight` solo si `distance=1` | 404 producto inexistente, 422 `depth` fuera de `1..3` o no numérico, 422 sin `product` |
| GET | `/components` | 200 `{"components":[[...]],"count":N}` (grupos ordenados) | — |

Notas F2: `depth` por defecto `2`; el origen nunca aparece en `reachable`; producto sin aristas → 200 con `"message":"producto aislado"`; grafo sin productos → 200 con `"message":"red vacía"` (esa regla tiene prioridad sobre el 404, porque aún no hay ningún producto que consultar); el orden de `reachable` lo fija el BFS (peso desc, id asc) y el frontend no reordena.

```bash
POST /products {"id":"pan"} ... {"id":"queso"}
POST /relationships {"source":"pan","target":"leche","weight":3}  # 201
POST /relationships {"source":"leche","target":"queso","weight":2} # 201
GET /reachable?product=pan&depth=2
# 200 {"product":"pan","depth":2,
#      "reachable":[{"id":"leche","distance":1,"weight":3},{"id":"queso","distance":2}]}
GET /reachable?product=queso&depth=2   # simétrico: leche 1, pan 2
GET /components  # 200 {"components":[["leche","pan","queso"]],"count":1}
```

F3 Propuesta justificable (regla de B, API de A, UI de C, acceptance de D):

| Método | Ruta | OK | Errores |
|---|---|---|---|
| GET | `/recommendations?product=pan&limit=5` | 200 `{"product","recommendations":[{"id","score","reason","distance"}]}`; ítems a 2 saltos llevan `via` | 404 producto inexistente, 422 `limit` fuera de `1..10` o no numérico, 422 sin `product` |

Notas F3: `limit` por defecto `5`; el origen nunca aparece en las recomendaciones; todo ítem trae `reason` no vacío; producto aislado o sin camino → 200 con `"message":"sin relaciones demostrables: no se inventan recomendaciones"`; grafo sin productos → 200 con `"message":"red vacía"` (misma prioridad sobre el 404 que en F2); el orden lo fija la regla (score desc, peso desc, id asc) y el frontend no reordena.

```bash
POST /products {"id":"pan"} ... {"id":"queso"}
POST /relationships {"source":"pan","target":"leche","weight":3}   # 201
POST /relationships {"source":"pan","target":"queso","weight":1}   # 201
POST /relationships {"source":"leche","target":"queso","weight":2} # 201
GET /recommendations?product=pan
# 200 {"product":"pan","recommendations":[
#   {"id":"leche","score":3.1,"reason":"relación directa peso 3 (compra conjunta frecuente)","distance":1},
#   {"id":"queso","score":1.1,"reason":"relación directa peso 1 (compra conjunta frecuente)","distance":1}]}
GET /recommendations?product=queso   # simétrico: leche 2.1, pan 1.1
GET /recommendations?product=pan&limit=0      # 422
GET /recommendations?product=nope             # 404 {"detail":"producto inexistente: 'nope'"}
```

## Experiencia de uso: roles y tema

El frontend tiene un selector **visual** de rol y un control de tema; no hay login ni permisos reales, y el backend no cambia.

- **Rol por defecto:** `cliente`. El selector `Cliente` / `Administrador` solo cambia la vista y se guarda en `localStorage` (`cc-role`).
- **Vista cliente (`ClientShowcase`):** buscador de producto + accesos rápidos a los productos del barrio. Muestra hasta **6 relacionados** con tarjetas que solo tienen nombre, la etiqueta `Se compran juntos` (relación directa) o `También te puede interesar` (segundo grado) y `Ver relacionados`. Cada tarjeta encadena otra búsqueda. No muestra grafo, scores, distancias, `via` ni la palabra técnica "saltos".
- **Vista administrador:** conserva `Mostrador` (`Ledger`), `La red del barrio` (`NetworkCanvas`), `Explora la red` (`Explorer`) y `Propuesta comercial` (`Recommend`).
- **Tema:** `Claro` / `Oscuro`; por defecto respeta `prefers-color-scheme`, se guarda en `localStorage` (`cc-theme`) y actualiza `data-theme` + `color-scheme`.
- **Implementación:** `frontend/src/App.tsx`, `ClientShowcase.tsx`, `RoleSwitch.tsx`, `ThemeToggle.tsx`, `lib/preferences.ts` y `styles.css`.

La vitrina cliente consume el mismo `GET /recommendations` real con `limit=6`; no hay lógica de grafo en TypeScript ni datos mock.

## Decisiones fijadas por el plan (grill + brainstorming, no re-discutir sin ADR)

- Grafo **NO-DIRIGIDO simétrico**: `pan-leche` crea ambas entradas `adj[A][B]=adj[B][A]`. Relación = "se compran juntos", sin orden. `edges()` devuelve cada arista una vez.
- Peso = **frecuencia/intensidad de co-compra** `int > 0`, default `1`. Duplicado exacto (cualquier orden) → `409` (sin auto-incremento, sin `PATCH`). Inválido (`<=0`, no-numérico, `source==target`/self-loop) → `422`.
- `max_depth` default `2`, máximo permitido `3` (`GET /reachable?depth=` valida `1<=depth<=3`, fuera de rango → `422`). Depth 1 = compra directa conjunta; depth 2 = complementario vía intermediario; depth ≥3 = ruido, prohibido como recomendación automática. BFS propio con visited, orden determinista (peso desc, luego id asc).

## Regla F3 (propuesta justificable, sin ML)

Implementada en `backend/app/recommender.py` (B) y expuesta por `GET /recommendations` (A); UI de administrador en `frontend/src/components/Recommend.tsx` y vitrina cliente en `frontend/src/components/ClientShowcase.tsx` (C); verificada por `scripts/acceptance/acceptanceF3.py` (D) 25/25 PASS.

1. **Candidatos:** BFS simétrico desde el producto consultado hasta 2 saltos. El origen se excluye.
2. **Score:** a 1 salto, `peso_directo`; a 2 saltos, `peso_vía * 0.7`. En ambos casos se suma `0.1 * vecinos_comunes`.
3. **Intermediario:** a 2 saltos se elige el que maximiza la arista intermediario→candidato; desempatan la arista origen→intermediario y el `id`.
4. **Orden:** `score` desc, peso de apoyo desc, `id` asc. `limit` válido `1..10`, por defecto `5`.
5. **`reason` no vacío:** `"relación directa peso 3 (compra conjunta frecuente)"` o `"alcance a 2 pasos vía leche (peso 2)"`. A 2 saltos también se expone `via`.
6. **Sin invención:** un producto sin camino demostrable no aparece; un producto aislado devuelve lista vacía; `depth > 2` se ignora. Grafo vacío → `200` + `message` (esa regla tiene prioridad sobre el `404`, igual que en F2).

**Sesgos:** favorece la co-compra frecuente y los productos con más vecinos en común; penaliza lo indirecto con el factor `0.7`; un producto aislado nunca se recomienda. Los valores `0.7` y `0.1` son parámetros fijos de diseño, no aprendizaje.

## Funcionalidades actuales vs futuras

**Actual (Task 0 + F1 + F2 + F3):** backend base (`GET /health`, `GET /`, CORS a `http://localhost:5173`), `ProductGraph` real no-dirigido, routers F1 (`/products`, `/relationships`, `/network`), `algorithms.py` con BFS y componentes propias, router F2 (`/reachable`, `/components`), `recommender.py` con la regla F3 y router `GET /recommendations`, `acceptanceF1.py` 30/30 + `acceptanceF2.py` 29/29 + `acceptanceF3.py` 25/25 PASS, frontend Vite React TS que consume la API real con selector visual de rol (cliente/administrador), tema claro/oscuro persistente y vitrina cliente de relacionados; el administrador conserva ledger, canvas, explorer y recommend. Sin mocks ni lógica de grafo en TS. Falta el panel F4 con cambio docente.

**Estado F1-F4:**

| Feature | Alcance previsto | Estado |
|---|---|---|
| F1 Red comercial inicial | `POST/GET /products`, `POST/GET /relationships`, `GET /network` + ledger/canvas | Completo: backend + acceptance 30/30 + UI |
| F2 Exploración | `GET /reachable?product=X&depth=2`, `GET /components` (BFS propio O(V+E)) | Completo: `algorithms.py` + router + explorer + acceptance 29/29 |
| F3 Propuesta justificable | `GET /recommendations?product=X&limit=5` con regla explícita + `reason` (sin ML) | Completo: regla (B) + API (A) + UI (C) + acceptance 25/25 (D); incluye roles/tema y vitrina cliente |
| F4 Panel demostrable | Tabs Red/Explora/Propuesta/Panel + `ChangeSlot` + cambio docente con ADR | No implementado |

## Equipo / aportes

| Feature | A | B | C | D | Pitch |
|---|---|---|---|---|---|
| T0 | base back | stub grafo | shell front | docs/git | — |
| F1 | router | grafo | ledger/canvas | acceptance | 1 |
| F2 | explore API | BFS | explorer UI | acceptance | 2 |
| F3 | recommend API | regla | recommend UI | acceptance | 3 |
| F4 | tabs | changeslot | panel | entrega | 4 |

F3 también incluye la separación visual cliente/administrador, el tema claro/oscuro y la vitrina `ClientShowcase` (rama `feature/f3-andres-roles-dark`); el cambio de rol es solo de demostración y no altera permisos.

Pitch F1 (rotación 1 según plan): pendiente de asignar por el equipo (orden sugerido: A). Video 3 min F1: pendiente (tarea humana, no va en este PR).
