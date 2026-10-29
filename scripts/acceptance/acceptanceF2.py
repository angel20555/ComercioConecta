"""Acceptance F2: exploración no-dirigida (BFS y componentes propias).

Uso (backend recién reiniciado, grafo vacío, puerto 8000):
    cd backend
    uvicorn app.main:app --port 8000
    # en otra terminal, desde la raíz del repo
    python scripts/acceptance/acceptanceF2.py

Casos del plan F2:
  1. Normal: BFS depth 2, depth 1 y simetría.
  2. Red vacía: 200 + message, nunca 404/500.
  3. Producto inexistente (red con datos): 404.
  4. Producto aislado: 200 + lista vacía + message.
  5. depth fuera de 1..3 o no numérico: 422.
  6. Ciclo: termina y no repite nodos.

Imprime `escenario|esperaba|obtuvo|PASS/FAIL` y sale 0 solo si todo pasa.
"""

import json
import time
import urllib.error
import urllib.request

# 127.0.0.1 y no "localhost": en Windows, localhost resuelve a ::1 y el
# connect() puede quedarse colgado cuando Uvicorn solo escucha en IPv4.
BASE = "http://127.0.0.1:8000"
TIMEOUT = 10
RESULTS = []


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r, timeout=TIMEOUT) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw) if raw else None
        except json.JSONDecodeError:
            return e.code, raw


def wait_backend(timeout=20.0):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(BASE + "/health", timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def check(name, expected, actual):
    ok = expected == actual
    RESULTS.append(ok)
    print(f"{name}|esperaba={expected}|obtuvo={actual}|{'PASS' if ok else 'FAIL'}")
    return ok


def load(products, edges):
    for pid in products:
        req("POST", "/products", {"id": pid})
    for source, target, weight in edges:
        req("POST", "/relationships",
            {"source": source, "target": target, "weight": weight})


def distances(body):
    return {i["id"]: i["distance"] for i in (body or {}).get("reachable", [])}


def main():
    if not wait_backend():
        print("backend-no-disponible|esperaba=200 ok|obtuvo=sin-conexion|FAIL")
        raise SystemExit(1)

    # Caso 2 (primero: exige grafo vacío): 200 + message, nunca 404/500.
    s, b = req("GET", "/components")
    check("vacia-components-status", 200, s)
    check("vacia-components-count", 0, (b or {}).get("count"))
    check("vacia-components-list", [], (b or {}).get("components"))
    check("vacia-components-message", True, bool((b or {}).get("message")))

    # Regla del router: con grafo vacío manda 200+message antes que 404,
    # porque todavía no existe ningún producto que consultar.
    s, b = req("GET", "/reachable?product=pan&depth=2")
    check("vacia-reachable-status", 200, s)
    check("vacia-reachable-list", [], (b or {}).get("reachable"))
    check("vacia-reachable-message", True, bool((b or {}).get("message")))

    # Caso 5: depth inválido -> 422 lo valida Pydantic antes del handler.
    for depth in ("0", "99", "-1", "abc"):
        s, _ = req("GET", f"/reachable?product=pan&depth={depth}")
        check(f"depth-invalido-{depth}", 422, s)

    s, _ = req("GET", "/reachable")
    check("depth-sin-product-422", 422, s)

    # Carga: grupo pan-leche-queso, grupo cafe-chocolate y un aislado.
    load(
        ["pan", "leche", "queso", "cafe", "chocolate", "aislado"],
        [("pan", "leche", 3), ("leche", "queso", 2), ("cafe", "chocolate", 1)],
    )

    # Caso 3: inexistente con red ya cargada -> 404 con detail.
    s, b = req("GET", "/reachable?product=fantasma")
    check("inexistente-status", 404, s)
    check("inexistente-detail", True, bool((b or {}).get("detail")))

    # Caso 4: producto aislado -> 200, lista vacía y message.
    s, b = req("GET", "/reachable?product=aislado&depth=2")
    check("aislado-status", 200, s)
    check("aislado-list", [], (b or {}).get("reachable"))
    check("aislado-message", True, bool((b or {}).get("message")))

    # Caso 1: normal depth 2 (pan -> leche 1, queso 2).
    s, b = req("GET", "/reachable?product=pan&depth=2")
    dist = distances(b)
    check("normal-status", 200, s)
    check("normal-distancias", {"leche": 1, "queso": 2}, dist)
    check("normal-origen-excluido", False, "pan" in dist)
    check("normal-peso-solo-directos", 3, next(
        (i.get("weight") for i in (b or {}).get("reachable", [])
         if i["id"] == "leche"), None))

    # Caso 1b: simetría (desde queso se llega a pan en 2).
    s, b = req("GET", "/reachable?product=queso&depth=2")
    check("simetria-queso", {"leche": 1, "pan": 2}, distances(b))

    # Caso 1c: depth 1 solo vecinos directos.
    s, b = req("GET", "/reachable?product=pan&depth=1")
    check("depth1-solo-directos", {"leche": 1}, distances(b))

    # Grupos separados.
    s, b = req("GET", "/components")
    comps = [sorted(c) for c in (b or {}).get("components", [])]
    check("componentes-status", 200, s)
    check("componentes-count", 3, (b or {}).get("count"))
    check("componentes-grupos", True,
          ["leche", "pan", "queso"] in comps
          and ["cafe", "chocolate"] in comps
          and ["aislado"] in comps)

    # Caso 6: ciclo a-b-c-a termina y cada nodo aparece una sola vez.
    load(["a", "b", "c"], [("a", "b", 1), ("b", "c", 1), ("c", "a", 1)])
    s, b = req("GET", "/reachable?product=a&depth=3")
    ids = [i["id"] for i in (b or {}).get("reachable", [])]
    check("ciclo-status", 200, s)
    check("ciclo-sin-repetir", True, len(ids) == len(set(ids)))
    check("ciclo-nodos", {"b", "c"}, set(ids))

    total = len(RESULTS)
    passed = sum(RESULTS)
    print(f"TOTAL|{passed}/{total}|{'PASS' if passed == total else 'FAIL'}")
    raise SystemExit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
