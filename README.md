# ComercioConecta

Pyme de tiendas de barrio: red de productos comprados juntos (datos sintéticos), API REST real + frontend que la consume. Grafo propio, sin NetworkX para cómputo.

## Decisiones (grill fijado)

- Grafo **NO-DIRIGIDO simétrico**: `pan-leche` crea ambas entradas `adj[A][B]=adj[B][A]`.
- Peso = **frecuencia de co-compra** `int > 0`, default `1`. Duplicado → `409` (cualquier orden). Inválido (`<=0`, texto, self-loop) → `422`.
- `max_depth` default `2`, rango `1..3` (`422` fuera de rango).

## Instalación

```bash
cd backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev -- --port 5173
npm run build
```

## Aceptación

```bash
python scripts/acceptance/acceptanceF1.py
python scripts/acceptance/acceptanceF2.py
python scripts/acceptance/acceptanceF3.py
python scripts/acceptance/acceptanceF4.py
```

## Endpoints (Task 0: solo `/health`)

| Método | Ruta | OK | Errores |
|---|---|---|---|
| GET | `/health` | 200 `{"status":"ok"}` | — |
| POST/GET | `/products` | 201 / 200 | 409 duplicado, 422 vacío |
| POST/GET | `/relationships` | 201 / 200 | 404 inexistente, 422 self/peso, 409 duplicada |
| GET | `/network` | 200 (+`message` si vacía) | — |
| GET | `/reachable?product=X&depth=2` | 200 | 404, 422 depth |
| GET | `/components` | 200 | — (vacía: 200+message) |
| GET | `/recommendations?product=X&limit=5` | 200 | 404, 422 limit |

## Equipo / aportes

| Feature | A | B | C | D | Pitch |
|---|---|---|---|---|---|
| T0 | base back | stub grafo | shell front | docs/git | — |
| F1 | router | grafo | ledger/canvas | acceptance | 1 |
| F2 | explore API | BFS | explorer UI | acceptance | 2 |
| F3 | recommend API | regla | recommend UI | acceptance | 3 |
| F4 | tabs | changeslot | panel | entrega | 4 |

Bitácora IA: `docs/aiLog.md`. Plan: `docs/superpowers/plans/2026-10-02-comercioconecta-f1-f4.md`.
