# ComercioConecta F1-F4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir ComercioConecta (pyme tiendas barrio, grafo co-compra sintético) como monorepo vertical F1→F4: grafo propio + API REST Python 3.12+ + frontend Vite React TS que consume backend real.

**Architecture:** Monorepo `backend/` (FastAPI + Pydantic v2, `ProductGraph` propio `dict[str,dict[str,float]]`, BFS propio, regla F3 explícita) + `frontend/` (Vite React TS, solo fetch al backend, canvas SVG propio sin cómputo de grafo) + `scripts/acceptance/` (scripts stdlib `urllib` sin frameworks) + `docs/aiLog.md`.

**Tech Stack:** Python 3.12+, FastAPI, Pydantic v2, Uvicorn, requirements.txt + venv; Node 20+, Vite + React + TypeScript; git + GitHub, tags `f1/f2/f3/f4`.

**Spec:** `07-brief-comercioconecta.md` (cliente/pyme, F1-F4, criterio éxito demo explicable) + `03-guia-comun-estudiantes.md` (reglas no negociables, aceptación, bitácora IA, pitch 7+3/video 3min, cambio requisito post-F2).

## Global Constraints

- Python 3.12+ obligatorio; `backend/requirements.txt` reproduceible + `venv/` gitignored.
- Grafo y algoritmos 100% propios. PROHIBIDO NetworkX para cómputo (solo se permitiría visualización de resultado ya calculado — en este plan NO se usa ni para eso; front dibuja SVG propio).
- Frontend libre pero OBLIGATORIO consumir backend real (`fetch http://localhost:8000`). Sin mock, sin lógica de grafo en front (no BFS, no componentes, no recomendaciones en TS).
- Datos 100% sintéticos coherentes (ej. `pan, leche, queso, café, arepa, chocolate`). No datos reales, no perfiles, no ML, no precios/campañas.
- Cada feature = rebanada vertical (núcleo Python → API → UI mínima → acceptance script → README + aiLog + tag + pitch).
- Convencional commits (`feat:`, `fix:`, `docs:`, `test:`), ramas `feature/fX-nombre`, PR con review cruzado, `main` protegida, tags `f1/f2/f3/f4`.
- Skills obligatorias aplicadas y citadas en cada Task (ver tabla Skills).
- Ahora SOLO plan, no código (modo ejecución futuro = `subagent-driven-development`).

### Skills aplicadas (trazabilidad exigida)

| Skill | Dónde se usa | Evidencia en plan |
|---|---|---|
| `brainstorming` | Antes de cada decisión creativa: modelado F1, regla F3, UX F1/F4 | Task F1 paso B0, Task F3 paso B0, Task F1/F4 pasos C0 — nota `Brainstorm:` con 2-3 opciones y elegida |
| `grilling` | Fija: dirigido vs no-dirigido + qué representa peso + max_depth justificable | Task F1 paso B0 `Grill-decision` bloqueada (ver Decisiones fijadas) |
| `frontend-design` | UI F1 mínima (ledger+canvas) y panel F4 (tokens, layout, copy) | Task F1-C, Task F4-C bloques `Design-plan` |
| `writing-plans` | Formato final de ESTE plan (`- [ ]`, archivos, interfaces, comandos) | Este documento |
| `subagent-driven-development` | Modo ejecución previsto (fresco por Task + review + ledger), NO ejecutar ahora | Sección Ejecución + por Task `Handoff` |

### Decisiones fijadas (salida de `grilling` + `brainstorming`, no re-discutir sin ADR)

1. **Dirigido vs no-dirigido → NO-DIRIGIDO SIMÉTRICO (revertido por decisión equipo).** Relación = "se compran juntos" (A-B implica B-A). Justificación negocio barrio: `pan-leche`, `café-pan` son co-ocurrencias sin orden. Implementación: `adj[A][B]=adj[B][A]=w` doble entrada. `edges()` devuelve cada arista una vez. BFS/recomendación sigue vecinos en ambas direcciones. Variante dirigida "se compra después de" queda reservada como posible cambio docente F4 con ADR.

2. **Peso → frecuencia/intensidad de co-compra (int > 0, default 1).** Nº tickets donde A y B aparecen juntos. Duplicado exacto en `POST` → `409` (sin auto-incremento, sin `PATCH`; para corregir peso se borra/recrea o se usa `PUT` explícito si se define en F4). Validación restaurada: `422` si `weight<=0`, no-numérico, o `source==target` (self-loop).
3. **max_depth justificable → default `2`, máximo permitido `3`.** Depth 1 = compra directa conjunta (propuesta fuerte). Depth 2 = complementario vía intermediario (propuesta débil, con `reason` que cita intermediario). Depth ≥3 = ruido "todo el catálogo" → prohibido como recomendación automática; `GET /reachable?depth=` valida `1<=depth<=3` (fuera de rango → `422`), default `2`. BFS propio con visited, orden determinista (vecinos ordenados por peso desc, luego id asc).

## Review Focus

1. `POST /relationships` con producto inexistente debe ser `404` (no `422` ni `500`) con `{"detail":"..."}` — test en F1.
2. `GET /network`, `/reachable`, `/components`, `/recommendations` con grafo vacío deben ser `200` con `message` explicativo y lista vacía, nunca `404/500` — test en cada acceptance.
3. `GET /reachable?product=X&depth=99` o `depth=0` debe ser `422`, no truncar silenciosamente — test en F2.
4. `GET /recommendations?product=X` nunca devuelve `X` ni productos sin camino demostrable; cada ítem trae `reason` no vacío — test en F3.
5. Frontend que calcula BFS/recomendación en TS o dibuja con datos mock es fallo de integración aunque se vea bien — verificar en review que todo panel lee `fetch` al backend.

---

### Task 0: Setup monorepo

**Files:**
- Create: `README.md`, `.gitignore`, `requirements.txt` → mover a `backend/requirements.txt`, `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/schemas.py`, `backend/app/graph.py`, `backend/app/routers/__init__.py`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `scripts/acceptance/.gitkeep`, `docs/aiLog.md`
- Modify: ninguno (repo vacío salvo `.opencode/`)

**Interfaces:**
- Consumes: nada.
- Produces: `GET /health -> {"status":"ok"}`; `client.ts: apiGet<T>(path:string):Promise<T>`, `apiPost<T>(path:string,body:unknown):Promise<T>` con `API_BASE=http://localhost:8000`; `ProductGraph` stub vacío con `add_product/add_edge` (firma real se fija en F1).

**Subtareas equipo (4 personas, todas aportan en cada Task):**

- [ ] **Step 0A (persona A — router/service base):** Escribe test fallando `curl GET /health == 200 {"status":"ok"}`. Implementa `backend/app/main.py` (FastAPI + CORS + `GET /health` + `GET /` mensaje). Crea `backend/requirements.txt` (`fastapi>=0.115,pydantic>=2.0,uvicorn>=0.30`). Comandos: `cd backend; python -m venv venv; ./venv/Scripts/activate; pip install -r requirements.txt; uvicorn app.main:app --reload --port 8000`. Expected: `200 ok`. Commit `feat: backend base health`.
- [ ] **Step 0B (persona B — grafo stub + venv):** Crea `backend/app/graph.py` con clase vacía `ProductGraph: adj: dict[str,dict[str,float]]` + métodos stub. Verifica `python -c "from app.graph import ProductGraph; print(ProductGraph())"`. Commit `feat: graph stub`.
- [ ] **Step 0C (persona C — frontend shell + client):** `npm create vite@latest frontend -- --template react-ts` (o manual mínimo), implementa `src/api/client.ts` + `App.tsx` con "ComercioConecta — conecta backend" + fetch a `/health`. Comandos: `cd frontend; npm install; npm run dev -- --port 5173; npm run build`. Expected: build PASS, health visible. Commit `feat: frontend shell + api client`.
- [ ] **Step 0D (persona D — aceptación/docs/git):** Crea `scripts/acceptance/.gitkeep`, `docs/aiLog.md` (tabla guía: Decisión|Herramienta|Propuesta|Acepté/Rechacé|Verificación), `README.md` (propósito, instalación, ejecución, endpoints stub, decisiones), `.gitignore` (venv, node_modules, dist), `git init; git add .; git commit -m "chore: monorepo setup"; gh repo create ComercioConecta --private --source=. --push; git branch -M main`. Expected: `git status` limpio, push ok. Commit + PR merged con review cruzado.
- [ ] **Step 0-verify:** `cd backend; uvicorn app.main:app --port 8000` + `cd frontend; npm run build` ambos PASS. Tag no (tag solo f1-f4).
- [ ] **Step 0-commit:** `git tag` ninguno; `git log --oneline` muestra 4 commits convencionales.

**Review Focus Task 0:** CORS permite `http://localhost:5173`; `requirements.txt` pinned mínimo; `venv/` y `node_modules/` ignorados.
**NO hacer:** No ML, no NetworkX, no datos reales, no lógica de grafo en front, no precios/campañas.

---

### Task F1: Red comercial inicial

**Files:**
- Create: `backend/app/schemas.py`, `backend/app/graph.py` (real), `backend/app/routers/products.py`, `backend/app/routers/relationships.py`, `backend/app/routers/network.py`, `frontend/src/components/Ledger.tsx`, `frontend/src/components/NetworkCanvas.tsx`, `scripts/acceptance/acceptanceF1.py`
- Modify: `backend/app/main.py` (montar routers), `frontend/src/App.tsx`, `frontend/src/api/client.ts` (tipos), `README.md`, `docs/aiLog.md`

**Interfaces:**
```python
# backend/app/graph.py
class ProductGraph:
    adj: dict[str, dict[str, float]]
    def add_product(self, pid: str) -> None  # ValueError("duplicate")
    def add_edge(self, a: str, b: str, weight: float = 1) -> None  # NO-DIRIGIDA: escribe adj[a][b]=adj[b][a]=w; ValueError("not-found"|"self-loop"|"invalid-weight"|"duplicate")
    def products(self) -> list[str]
    def edges(self) -> list[tuple[str,str,float]]  # cada no-dirigida una vez, ordenada por (min,max)
    def neighbors(self, pid: str) -> dict[str,float]  # vecinos simétricos (para BFS no-dirigido)
    def to_network(self) -> dict  # {"nodes":[...],"edges":[{"source","target","weight"}],"undirected":true,"message"?:str}
# schemas.py (Pydantic v2)
ProductIn: {id: str(min_length=1)}; RelationshipIn: {source:str, target:str, weight:int|float =1 (>0)}
# API
POST /products -> 201 {id} | 409 duplicate | 422 vacío
GET /products -> 200 {products:[...]}
POST /relationships NO-DIRIGIDA -> 201 {source,target,weight} | 404 inexistente | 422 self-loop/peso inválido (<=0, no-numérico) | 409 duplicada (mismo par en cualquier orden)
GET /relationships -> 200 {relationships:[...]}
GET /network -> 200 {nodes,edges,undirected:true} | 200 vacía {nodes:[],edges:[],message:"red vacía: cargue productos"}
```
```ts
// frontend/src/api/client.ts
listProducts():Promise<{products:string[]}>; createProduct(id:string):Promise<...>;
listRels():Promise<...>; createRel(source:string,target:string,weight:number):Promise<...>;
getNetwork():Promise<{nodes:{id:string}[],edges:{source:string,target:string,weight:number}[],message?:string}>;
```

- [ ] **Step F1-B0 brainstorm+grill (persona B, 15 min, bloqueante):** Aplica `brainstorming`: dict-adyacencia vs matriz vs lista → elige dict-adyacencia simétrica por O(1). Aplica `grilling`: fija NO-DIRIGIDO "se compran juntos" + peso=frecuencia + depth 2 (ver Decisiones fijadas). OJO: `pan-leche` crea ambas entradas. Registra en `docs/aiLog.md` + `README.md## Decisiones`. Sin esto no se codea.
- [ ] **Step F1-A1 test que falla (A):** `scripts/acceptance/acceptanceF1.py` (urllib, 6 casos guía): 1) normal simétrica: `pan,leche,queso` + `pan-leche w3, leche-queso w2` → 200 3n/2a y verifica SIMETRÍA (`leche-pan` visible vía misma arista); 2) vacía → 200+message; 3) inexistente `pan-bogus` → 404; 4) ruta inexistente `GET /products/xxx` → 404; 5) inválidos: duplicado producto → 409, duplicado relación `pan-leche` y `leche-pan` → 409, self `pan-pan` → 422, peso `0/-1/string` → 422; 6) ciclo no-dirigido: triángulo `a-b,b-c,c-a` se almacena sin duplicar y `GET /network` devuelve 3 aristas. Imprime `escenario|esperaba|obtuvo|PASS/FAIL`. Run → FAIL esperado.
- [ ] **Step F1-B1 implementa grafo (B):** Implementa `ProductGraph` no-dirigido exacto, `strip()`, sin NetworkX. Traza: `pan-leche(3),leche-queso(2)` → `neighbors(pan)={leche:3}`, `neighbors(queso)={leche:2}`, `edges` 2.
- [ ] **Step F1-A2 implementa routers (A):** `schemas.py` + 3 routers códigos exactos 409/404/422/201/200 (duplicado en cualquier orden → 409; peso inválido → 422). Monta `main.py`. `cd backend; uvicorn app.main:app --port 8000` → 6/6 PASS.
- [ ] **Step F1-C0/C1 UI mínima (C + `frontend-design`):** Tokens verde-tienda `#1B7A3D`+papel `#FAF6EF`+tinta `#1E1B16`; izquierda ledger, derecha canvas SVG NO-DIRIGIDO (líneas sin flecha, grosor∝peso, solo render `GET /network`, cero cómputo). `Ledger.tsx` + `NetworkCanvas.tsx`. `cd frontend; npm run dev; npm run build` PASS.
- [ ] **Step F1-D1 docs+git (D):** README (endpoints+códigos, decisión NO-DIRIGIDO/peso-frecuencia + ejemplo pan-leche), aiLog ≥2 filas, video+pitch rotación 1. PR `feature/f1-red-inicial` → merge → `git tag f1`.
- [ ] **Step F1-verify Review Focus:** `POST {pan}` x2 → 201 luego 409; `POST {pan-leche}` y `POST {leche-pan}` → 201 luego 409; `POST {a-bogus}` → 404; `POST {a-a}` y `{w:0}`/`{w:-1}`/`{w:"x"}` → 422; vacía → 200+message; `GET /network` contiene arista una sola vez.

**Qué NO hacer F1:** No BFS/componentes/recomendaciones; no NetworkX ni en requirements; no precios/campañas; no persistencia DB (memoria basta); no lógica grafo en front.

---

### Task F2: Exploración de relaciones

**Files:**
- Create: `backend/app/algorithms.py`, `backend/app/routers/explore.py`, `frontend/src/components/Explorer.tsx`, `scripts/acceptance/acceptanceF2.py`
- Modify: `backend/app/main.py`, `backend/app/graph.py` (solo `neighbors` si falta), `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `README.md`, `docs/aiLog.md`

**Interfaces:**
```python
# algorithms.py NO-DIRIGIDO: BFS sigue neighbors simétricos, visited, orden peso-desc/id-asc
def bfs_reachable(graph: ProductGraph, origin: str, depth: int = 2) -> dict[str,int]
def connected_components(graph: ProductGraph) -> list[list[str]]  # conexas simples; cada una ordenada, lista ordenada por primer elem
# API: /reachable devuelve vecinos simétricos; aislado = sin vecinos → 200+message
```
# API
GET /reachable?product=X&depth=2 -> 200 {product,depth,reachable:[{id,distance,weight?}],message?} | 404 inexistente | 422 depth fuera 1..3 | 200 aislado {reachable:[],message:"producto aislado"}
GET /components -> 200 {components:[[ids]],count} | 200 vacía {components:[],count:0,message:"red vacía"}
```
```ts
reachable(product:string,depth?:number):Promise<...>; getComponents():Promise<...>;
```

- [ ] **Step F2-B0 traza (B + `brainstorming`):** Ej. no-dirigido `pan-leche(3),leche-queso(2),café-solo`: BFS pan d2 → `{leche:1,queso:2}` y BFS queso → `{leche:1,pan:2}` (simétrico, clave demo). Comps `[[café],[leche,pan,queso]]`. aiLog.
- [ ] **Step F2-D0 acceptance primero (D):** `acceptanceF2.py` 6 casos no-dirigidos: 1) normal + simetría (pan ve queso y queso ve pan); 2) vacía; 3) inexistente 404; 4) aislado 200+message; 5) `depth=0/99/abc` 422; 6) ciclo triángulo `a-b-c-a` termina 1 vez c/u. Run → FAIL.
- [ ] **Step F2-B1/A1 núcleo+API (B+A):** B implementa `algorithms.py` (BFS + componentes, O(V+E)). A implementa `routers/explore.py` con validaciones exactas + monta. `cd backend; uvicorn app.main:app --port 8000; python scripts/acceptance/acceptanceF2.py` → Expected: 6/6 PASS. A además re-ejecuta `acceptanceF1.py` sin regresión.
- [ ] **Step F2-C1 UI explorer (C):** `Explorer.tsx`: input producto + slider/select depth 1-3 (default 2, hint negocio "1=directo, 2=complementario, 3=máximo ruidoso") + lista alcanzables con distancia + vista componentes (chips por grupo). Todo vía `client.ts`, sin BFS en TS. `npm run build` PASS.
- [ ] **Step F2-D1 docs+git (D):** README (tabla `/reachable`/`/components` + justificación max_depth negocio + complejidad BFS O(V+E)), aiLog (decisión depth auditada), video+pitch (rotación 2, distinto de F1). PR `feature/f2-exploracion` review cruzado → merge → `git tag f2`.
- [ ] **Step F2-verify:** `GET /reachable?product=pan&depth=2` 200 distancias correctas; `?depth=99` 422; `?product=nope` 404; `GET /components` cuenta grupos separados.

**Qué NO hacer F2:** No recomendar/ordenar por negocio (eso es F3); no convertir "todo el catálogo" en recomendación; no NetworkX; no DFS disfrazado sin visited.

---

### Task F3: Propuesta comercial justificable

**Files:**
- Create: `backend/app/recommender.py`, `backend/app/routers/recommend.py`, `frontend/src/components/Recommend.tsx`, `scripts/acceptance/acceptanceF3.py`
- Modify: `backend/app/main.py`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `README.md`, `docs/aiLog.md`

**Interfaces:**
```python
# backend/app/recommender.py NO-DIRIGIDO — REGLA EXPLÍCITA (no ML)
# 1) candidatos = bfs_reachable simétrico(origin,2); 2) excluye origin; 3) score = (peso_directo si d==1 else max_peso_vía*0.7) + 0.1*vecinos_comunes;
# 4) orden score-desc, peso-desc, id-asc; 5) limit 1..10 default 5; 6) reason simétrica.
def recommend(graph: ProductGraph, origin: str, limit: int = 5) -> list[dict]  # {id,score,reason,distance,via?}
# reason: "relación directa peso 3 (compra conjunta frecuente)" | "alcance a 2 pasos vía leche (peso 2)"
# API
GET /recommendations?product=X&limit=5 -> 200 {product,recommendations:[{id,score,reason,distance}],message?}
 | 404 inexistente | 422 limit fuera 1..10 | 200 sin-relación {recommendations:[],message:"sin relaciones demostrables: no se inventan recomendaciones"}
```
```ts
getRecommendations(product:string,limit?:number):Promise<...>;
```

- [ ] **Step F3-B0 regla (B + `brainstorming` obligatorio):** Opciones (a)solo-peso-directo (b)peso+distancia+vecinos-comunes SIMÉTRICA ELEGIDA (c)PageRank. Elige (b) explicable. README## Regla F3 + sesgos ("favorece co-compra frecuente; aislado nunca recomienda; depth>2 ignorado"). aiLog.
- [ ] **Step F3-D0 acceptance primero (D):** `acceptanceF3.py` simétrico 6 casos: 1) normal `pan-leche(3),pan-queso(1),leche-queso(2)` desde pan → leche primero, con reason, sin pan; 1b) SIMETRÍA: desde queso recomienda pan/leche; 2) escasa; 3) separados no mezcla; 4) 404; 5) `limit=0/99` 422; 6) aislado → 200+message. Run → FAIL.
- [ ] **Step F3-B1/A1 implementa (B+A):** B `recommender.py` puro (usa `bfs_reachable`, sin NetworkX). A `routers/recommend.py` + validaciones + monta. Run ambos acceptance F3 + regresión F1/F2 → PASS.
- [ ] **Step F3-C1 UI (C):** `Recommend.tsx`: input producto + limit + tarjetas propuesta (id, score, distance, reason destacada) + estado vacío "Sin relaciones demostrables". Solo fetch. Build PASS.
- [ ] **Step F3-D1 docs+git (D):** README regla + sesgos/límites, aiLog, video+pitch (rotación 3). PR `feature/f3-propuesta` review cruzado → merge → `git tag f3`.
- [ ] **Step F3-verify:** Resp. nunca contiene origin; todo ítem tiene reason; grupos desconectados no se mezclan.

**Qué NO hacer F3:** No ML/IA, no inventar sin camino, no auto-recomendar, no precios/campañas, no cambiar semántica peso/dirección.

---

### Task F4: Panel comercial demostrable

**Files:**
- Create: `frontend/src/components/Panel.tsx`, `frontend/src/components/ChangeSlot.tsx`, `scripts/acceptance/acceptanceF4.py`
- Modify: `frontend/src/App.tsx` (tabs: Red|Explora|Propuesta|Panel), `backend/app/main.py` (solo si cambio docente exige campo/endpoint — con ADR), `README.md`, `docs/aiLog.md`

**Interfaces:**
- Front: `Panel.tsx` compone `Ledger+NetworkCanvas+Explorer+Recommend` en un flujo demo (registra → consulta → propone) + `ChangeSlot.tsx` hueco aislado `props:{data:any}` para cambio docente sin tocar núcleo. Back: sin cambios salvo `CHANGELOG-docente.md` si aplica.
- `acceptanceF4.py` 5 casos panel: normal demo punta-a-punta, aislado, inexistente, vacía, inválido (re-ejecuta F1-F3 como regresión + verifica `npm run build`).

- [ ] **Step F4-C0 diseño (C + `frontend-design`):** `Design-plan` panel: misma paleta F1, tabs claras, canvas grande explicativo (aristas grosor∝peso, recomendados resaltados, tooltip reason), copy demo "El encargado consulta pan y entiende por qué". Layout ASCII en README. Principio: audacia en 1 lugar (canvas explicativo), resto sobrio.
- [ ] **Step F4-D0 acceptance (D):** `scripts/acceptance/acceptanceF4.py`: resetea (reinicia backend), carga set demo, asserts caso normal + 4 bordes (códigos 200/404/422 exactos), imprime PASS/FAIL, luego corre F1-F3 y exige 0 regresiones. Run → FAIL hasta integrar.
- [ ] **Step F4-A1/B1 integración (A+B):** A cablea tabs + flujo demo + manejo errores por código (409/404/422 visibles). B deja `ChangeSlot` + `docs/CHANGELOG-docente.md` (impacto, decisión, qué cambia/no cambia, demo adaptación). Ambos sin lógica grafo en front.
- [ ] **Step F4-C1 pulido (C):** Canvas resalta recomendación + reason al hover/click, responsive móvil, foco teclado, `prefers-reduced-motion`. `cd frontend; npm run build` PASS.
- [ ] **Step F4-D1 entrega (D + todos):** README final (instalación 1-comando por lado, endpoints tabla completa, decisiones, cambio docente, pitch), aiLog completa, video 3min respaldo, pitch 7+3 (rotación 4 — quien no expuso). PR `feature/f4-panel` review cruzado → merge → `git tag f4` + release GitHub con URL repo.
- [ ] **Step F4-verify:** Demo criterio éxito: analista registra, encargado consulta `pan` y recibe propuesta explicable; sin conexiones → mensaje sin inventar. `python scripts/acceptance/acceptanceF4.py` + `npm run build` PASS.

**Qué NO hacer F4:** No agregar features fuera de alcance sin justificar costo/valor; no mover cómputo al front; no NetworkX cómputo; no datos reales.

---

## Flujo git + equipo 4 (crítico, aplica a Task 0/F1-F4)

- Ramas: `main` protegida (requiere PR + 1 review ≠ autor + checks build+acceptance). Ramas `feature/fX-nombre` (ej. `feature/f1-red-inicial`). Nunca push directo a `main`.
- Commits convencionales: `feat:`, `fix:`, `test:`, `docs:`, `chore:`. Cada Task-A/B/C/D commitea lo suyo.
- PR: template (qué cambia, cómo verificar, acceptance output pegado). Review cruzado obligatorio.
- Tags/releases: `f1,f2,f3,f4` tras merge de cada feature (`git tag f1; git push origin f1`).
- Rotación pitch: tabla en README; nadie repite hasta exponer los 4 (salvo autorización docente). Orden sugerido: F1→A, F2→B, F3→C, F4→D (ajustable, pero registrar).
- Tabla aportes por feature (README + aiLog): `| Integrante | Aporte (archivo/PR) | Evidencia (commit/PR) | Rol pitch |`.
- Coevaluación confidencial al cerrar cada feature (form interno, no en repo).
- Anti-silos: cada persona en el semestre debe sumar: (1) una decisión grafo/algoritmo, (2) una revisión/prueba, (3) una parte funcional integrada. Matriz sugerida: A router/service+review, B grafo/algoritmo+traza, C UI/client+integración, D acceptance/docs+review — rotar 1 rol por feature para que todos toquen back+front cada feature.

| Feature | A | B | C | D |
|---|---|---|---|---|
| F1 | router/service | grafo+grill | UI ledger/canvas | acceptance/docs |
| F2 | API explore | BFS/componentes | UI explorer | acceptance/docs |
| F3 | API recommend | regla/recommender | UI recommend | acceptance/docs |
| F4 | integración tabs | changeslot/ADR | panel/canvas | acceptance F4/entrega |

## Comandos canónicos (pegar en README)

```bash
# backend (cada Task)
cd backend
python -m venv venv
./venv/Scripts/activate  # Windows; source venv/bin/activate en Unix
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# acceptance (backend corriendo)
python scripts/acceptance/acceptanceF1.py
python scripts/acceptance/acceptanceF2.py
python scripts/acceptance/acceptanceF3.py
python scripts/acceptance/acceptanceF4.py
# frontend
cd frontend
npm install
npm run dev -- --port 5173
npm run build
# git
git checkout -b feature/fX-nombre
git add <archivos>; git commit -m "feat: ..."
gh pr create --fill; gh pr merge --squash
git tag fX; git push origin fX
```

## Ejecución por subagentes (NO ahora, solo previsto)

REQUIRED: `subagent-driven-development`. Por Task: subagente fresco A/B/C/D con brief (este plan + interfaces exactas), luego reviewer (spec compliance + calidad: sin NetworkX cómputo, sin grafo en front, códigos exactos), ledger `docs/superpowers/sdd/progress.md`, 5 rondas fix máx. Ahora entregar SOLO este plan.
