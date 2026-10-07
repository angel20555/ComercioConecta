"""Acceptance F1: red comercial inicial (stdlib urllib, sin frameworks).

Uso (backend recién reiniciado, grafo vacío):
    cd backend
    uvicorn app.main:app --port 8000
    python scripts/acceptance/acceptanceF1.py   # desde la raíz del repo

Imprime `escenario|esperaba|obtuvo|PASS/FAIL` y sale 0 solo si todo pasa.
"""

import json
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000"
RESULTS = []


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r) as resp:
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


def main():
    if not wait_backend():
        print("backend-no-disponible|esperaba=200 ok|obtuvo=sin-conexion|FAIL")
        raise SystemExit(1)

    # Caso 2: red vacía -> 200 + message, nunca 404/500.
    s, b = req("GET", "/network")
    check("vacia-network-status", 200, s)
    check("vacia-network-nodes", [], (b or {}).get("nodes"))
    check("vacia-network-edges", [], (b or {}).get("edges"))
    check("vacia-network-message", True, bool((b or {}).get("message")))
    s, b = req("GET", "/products")
    check("vacia-products", (200, []), (s, (b or {}).get("products")))

    # Caso 3: relación con producto inexistente -> 404 {"detail": ...}.
    s, b = req("POST", "/relationships",
               {"source": "pan", "target": "bogus", "weight": 1})
    check("inexistente-status", 404, s)
    check("inexistente-detail", True, bool((b or {}).get("detail")))

    # Caso 4: ruta inexistente -> 404.
    s, _ = req("GET", "/products/xxx")
    check("ruta-inexistente-status", 404, s)

    # Carga base para casos 1 y 5.
    for pid in ("pan", "leche", "queso"):
        s, _ = req("POST", "/products", {"id": pid})
        check(f"alta-{pid}", 201, s)

    # Caso 5: inválidos.
    s, _ = req("POST", "/products", {"id": "pan"})
    check("duplicado-producto", 409, s)
    s, _ = req("POST", "/products", {"id": ""})
    check("vacio-producto", 422, s)
    s, _ = req("POST", "/relationships",
               {"source": "pan", "target": "leche", "weight": 3})
    check("alta-pan-leche", 201, s)
    s, _ = req("POST", "/relationships",
               {"source": "leche", "target": "pan", "weight": 3})
    check("duplicado-rel-orden-inverso", 409, s)
    s, _ = req("POST", "/relationships",
               {"source": "pan", "target": "pan", "weight": 1})
    check("self-loop", 422, s)
    for w in (0, -1, "x"):
        s, _ = req("POST", "/relationships",
                   {"source": "pan", "target": "queso", "weight": w})
        check(f"peso-invalido-{w}", 422, s)

    # Caso 1: normal simétrica pan-leche(3), leche-queso(2).
    s, _ = req("POST", "/relationships",
               {"source": "leche", "target": "queso", "weight": 2})
    check("alta-leche-queso", 201, s)
    s, net = req("GET", "/network")
    check("normal-status", 200, s)
    net = net if isinstance(net, dict) else {}
    nodes = net.get("nodes", [])
    edges = net.get("edges", [])
    check("normal-nodos", 3, len(nodes))
    check("normal-aristas", 2, len(edges))
    pares = {(e["source"], e["target"]) for e in edges}
    simetrica = (("leche", "pan") in pares or ("pan", "leche") in pares)
    check("normal-simetria-una-vez", True, simetrica and len(pares) == 2)
    pesos = {(e["source"], e["target"]): e["weight"] for e in edges}
    check("normal-pesos", True,
          pesos.get(("pan", "leche")) == 3 or pesos.get(("leche", "pan")) == 3)
    s, rels = req("GET", "/relationships")
    rels = rels if isinstance(rels, dict) else {}
    check("normal-rels", (200, 2), (s, len(rels.get("relationships", []))))

    # Caso 6: ciclo no-dirigido a-b-c-a se almacena sin duplicar (3 aristas).
    for pid in ("a", "b", "c"):
        req("POST", "/products", {"id": pid})
    for a, b in (("a", "b"), ("b", "c"), ("c", "a")):
        s, _ = req("POST", "/relationships",
                   {"source": a, "target": b, "weight": 1})
        check(f"triangulo-{a}-{b}", 201, s)
    s, net = req("GET", "/network")
    net = net if isinstance(net, dict) else {}
    tri = [e for e in net.get("edges", [])
           if e["source"] in "abc" and e["target"] in "abc"]
    check("triangulo-3-aristas", 3, len(tri))

    total = len(RESULTS)
    passed = sum(RESULTS)
    print(f"TOTAL|{passed}/{total}|{'PASS' if passed == total else 'FAIL'}")
    raise SystemExit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
