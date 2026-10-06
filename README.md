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
scripts/acceptance/      # scripts stdlib urllib (futuro F1-F4); hoy solo .gitkeep
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

Aceptación (scripts futuros F1-F4, aún no existen; hoy solo `scripts/acceptance/.gitkeep`):

```bash
python scripts/acceptance/acceptanceF1.py
python scripts/acceptance/acceptanceF2.py
python scripts/acceptance/acceptanceF3.py
python scripts/acceptance/acceptanceF4.py
```

## Endpoints que REALMENTE existen (Task 0)

Verificado en `backend/app/main.py`. Solo existen estos dos; todo lo demás es futuro (ver abajo).

| Método | Ruta | OK | Errores |
|---|---|---|---|
| GET | `/health` | 200 `{"status":"ok"}` | — |
| GET | `/` | 200 `{"message":"ComercioConecta API — red comercial de tiendas de barrio"}` | — |

## Decisiones fijadas por el plan (grill + brainstorming, no re-discutir sin ADR)

- Grafo **NO-DIRIGIDO simétrico**: `pan-leche` crea ambas entradas `adj[A][B]=adj[B][A]`. Relación = "se compran juntos", sin orden. `edges()` devuelve cada arista una vez.
- Peso = **frecuencia/intensidad de co-compra** `int > 0`, default `1`. Duplicado exacto (cualquier orden) → `409` (sin auto-incremento, sin `PATCH`). Inválido (`<=0`, no-numérico, `source==target`/self-loop) → `422`.
- `max_depth` default `2`, máximo permitido `3` (`GET /reachable?depth=` valida `1<=depth<=3`, fuera de rango → `422`). Depth 1 = compra directa conjunta; depth 2 = complementario vía intermediario; depth ≥3 = ruido, prohibido como recomendación automática. BFS propio con visited, orden determinista (peso desc, luego id asc).

## Funcionalidades actuales vs futuras

**Actual (Task 0, lo único implementado):** backend base (`GET /health`, `GET /`, CORS a `http://localhost:5173`), stub vacío `ProductGraph` (`adj`, `add_product`/`add_edge` lanzan `NotImplementedError`), frontend shell Vite React TS (`src/api/client.ts` con `API_BASE=http://localhost:8000` y `apiGet`/`apiPost`; `src/App.tsx` muestra el estado real de `/health`, sin mocks ni lógica de grafo en TS), docs y git. No hay productos, relaciones, red, exploración ni recomendaciones todavía.

**Futuro (F1-F4 planificadas, NO implementadas):**

| Feature | Alcance previsto | Estado |
|---|---|---|
| F1 Red comercial inicial | `POST/GET /products`, `POST/GET /relationships`, `GET /network` + ledger/canvas | No implementado |
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
