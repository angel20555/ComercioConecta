# ComercioConecta

## Propósito

ComercioConecta es la red comercial de pymes de tiendas de barrio: registra productos que se compran juntos (datos 100% sintéticos, p. ej. `pan, leche, queso, café, arepa, chocolate`) y expone esa red vía API REST real consumida por un frontend. Grafo y algoritmos 100% propios (`dict[str, dict[str, float]]`, BFS propio); prohibido NetworkX para cómputo.

Plan de trabajo: `docs/superpowers/plans/2026-10-02-comercioconecta-f1-f4.md`. Bitácora IA: `docs/aiLog.md`.

## Estructura del monorepo (Task 0)

```text
backend/                 # FastAPI + Pydantic v2 + Uvicorn
  requirements.txt       # fastapi, pydantic v2, uvicorn
  app/
    __init__.py
    main.py              # FastAPI + CORS + GET /health + GET /
    graph.py             # ProductGraph stub T0 (adj vacío, add_* -> NotImplementedError; real en F1)
docs/
  aiLog.md               # bitácora IA (tabla Decisión|Herramienta|Propuesta|Acepté/Rechacé|Verificación)
  superpowers/plans/     # plan F1-F4
scripts/acceptance/      # scripts stdlib urllib (F1 existe: acceptanceF1.py 30/30 PASS; F2-F4 futuros)
frontend/                # Task 0C (integrado): Vite React TS que consume el backend real
  src/api/client.ts      # apiGet<T>/apiPost<T> con API_BASE=http://localhost:8000 (sin mocks, sin lógica de grafo)
  src/App.tsx            # "ComercioConecta — conecta backend" + muestra el estado real de /health
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

Frontend (Task 0C, ya integrado):

```bash
cd frontend
npm install
npm run dev -- --port 5173
npm run build
```

Aceptación (F1 existe y pasa 30/30 con backend recién reiniciado en `http://localhost:8000`; F2-F4 futuros):

```bash
python scripts/acceptance/acceptanceF1.py
python scripts/acceptance/acceptanceF2.py
python scripts/acceptance/acceptanceF3.py
python scripts/acceptance/acceptanceF4.py
```

## Endpoints (verificado contra `backend/app/routers/` + `acceptanceF1.py` 30/30 PASS)

Base T0 (sigue igual):

| Método | Ruta | OK | Errores |
|---|---|---|---|
| GET | `/health` | 200 `{"status":"ok"}` | — |
| GET | `/` | 200 `{"message":"ComercioConecta API — red comercial de tiendas de barrio"}` | — |

F1 Red comercial inicial (backend de A+B; UI ledger/canvas pendiente de C):

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

## Decisiones fijadas por el plan (grill + brainstorming, no re-discutir sin ADR)

- Grafo **NO-DIRIGIDO simétrico**: `pan-leche` crea ambas entradas `adj[A][B]=adj[B][A]`. Relación = "se compran juntos", sin orden. `edges()` devuelve cada arista una vez.
- Peso = **frecuencia/intensidad de co-compra** `int > 0`, default `1`. Duplicado exacto (cualquier orden) → `409` (sin auto-incremento, sin `PATCH`). Inválido (`<=0`, no-numérico, `source==target`/self-loop) → `422`.
- `max_depth` default `2`, máximo permitido `3` (`GET /reachable?depth=` valida `1<=depth<=3`, fuera de rango → `422`). Depth 1 = compra directa conjunta; depth 2 = complementario vía intermediario; depth ≥3 = ruido, prohibido como recomendación automática. BFS propio con visited, orden determinista (peso desc, luego id asc).

## Funcionalidades actuales vs futuras

**Actual (Task 0 + F1 backend):** backend base (`GET /health`, `GET /`, CORS a `http://localhost:5173`), `ProductGraph` real no-dirigido, routers F1 y `acceptanceF1.py` 30/30 PASS, frontend shell Vite React TS (`src/api/client.ts` con `API_BASE=http://localhost:8000`; `src/App.tsx` muestra el estado real de `/health`, sin mocks ni lógica de grafo en TS), docs y git. Aún no hay UI ledger/canvas F1 (paso C), exploración (F2), recomendaciones (F3) ni panel (F4).

**Estado F1-F4:**

| Feature | Alcance previsto | Estado |
|---|---|---|
| F1 Red comercial inicial | `POST/GET /products`, `POST/GET /relationships`, `GET /network` + ledger/canvas | Backend + acceptance OK (30/30); UI ledger/canvas pendiente (C) |
| F2 Exploración | `GET /reachable?product=X&depth=2`, `GET /components` (BFS propio O(V+E)) | No implementado |
| F3 Propuesta justificable | `GET /recommendations?product=X&limit=5` con regla explícita + `reason` (sin ML) | No implementado |
| F4 Panel demostrable | Tabs Red/Explora/Propuesta/Panel + `ChangeSlot` + cambio docente con ADR | No implementado |

## Equipo / aportes

| Feature | A | B | C | D | Pitch |
|---|---|---|---|---|---|
| T0 | base back | stub grafo | shell front | docs/git | — |
| F1 | router | grafo | ledger/canvas | acceptance | 1 |
| F2 | explore API | BFS | explorer UI | acceptance | 2 |
| F3 | recommend API | regla | recommend UI | acceptance | 3 |
| F4 | tabs | changeslot | panel | entrega | 4 |

Pitch F1 (rotación 1 según plan): pendiente de asignar por el equipo (orden sugerido: A). Video 3 min F1: pendiente (tarea humana, no va en este PR).
