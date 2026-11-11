"""Acceptance F3: propuesta comercial justificable (regla explícita, sin ML).

Uso (backend recién reiniciado, grafo vacío, puerto 8000):
    cd backend
    uvicorn app.main:app --port 8000
    # en otra terminal, desde la raíz del repo
    python scripts/acceptance/acceptanceF3.py

Casos del plan F3:
  1. Normal: pan-leche(3), pan-queso(1), leche-queso(2) desde pan ->
     leche primero, reason no vacío y sin pan (nunca auto-recomendar).
  1b. Simetría: desde queso recomienda pan y leche.
  2. Red escasa: una sola relación -> una propuesta con reason.
  3. Grupos separados: desde pan no aparece el otro grupo ni el aislado.
  4. Producto inexistente -> 404 con detail.
  5. limit fuera de 1..10 o no numérico -> 422.
  6. Aislado -> 200 + lista vacía + message (no se inventan propuestas).
  + Red vacía -> 200 + message, nunca 404/500 (antes de cargar).

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


def ids(body):
    return [i["id"] for i in (body or {}).get("recommendations", [])]


def reasons_ok(body):
    items = (body or {}).get("recommendations", [])
    return all(str(i.get("reason", "")).strip() for i in items)


def main():
    if not wait_backend():
        print("backend-no-disponible|esperaba=200 ok|obtuvo=sin-conexion|FAIL")
        raise SystemExit(1)

    # Caso 7 (primero: exige grafo vacío): 200 + message, nunca 404/500.
    s, b = req("GET", "/recommendations?product=pan")
    check("vacia-status", 200, s)
    check("vacia-list", [], (b or {}).get("recommendations"))
    check("vacia-message", True, bool((b or {}).get("message")))

    # Carga: grupo normal (pan-leche-queso), grupo escasa
    # (cafe-chocolate, una sola relación) y un producto aislado.
    load(
        ["pan", "leche", "queso", "cafe", "chocolate", "aislado"],
        [("pan", "leche", 3), ("pan", "queso", 1),
         ("leche", "queso", 2), ("cafe", "chocolate", 1)],
    )

    # Caso 4: inexistente con red ya cargada -> 404 con detail.
    s, b = req("GET", "/recommendations?product=fantasma")
    check("inexistente-status", 404, s)
    check("inexistente-detail", True, bool((b or {}).get("detail")))

    # Caso 6: producto aislado -> 200, lista vacía y message (no inventa).
    s, b = req("GET", "/recommendations?product=aislado")
    check("aislado-status", 200, s)
    check("aislado-list", [], (b or {}).get("recommendations"))
    check("aislado-message", True, bool((b or {}).get("message")))

    # Caso 1: normal desde pan -> leche primero, orden y reason.
    s, b = req("GET", "/recommendations?product=pan")
    check("normal-status", 200, s)
    check("normal-orden", ["leche", "queso"], ids(b))
    check("normal-primero-leche", "leche", ids(b)[0] if ids(b) else None)
    check("normal-sin-origen", False, "pan" in ids(b))
    check("normal-reason", True, reasons_ok(b))

    # Caso 1b: simetría -> desde queso recomienda pan y leche.
    s, b = req("GET", "/recommendations?product=queso")
    check("simetria-status", 200, s)
    check("simetria-queso", {"leche", "pan"}, set(ids(b)))
    check("simetria-reason", True, reasons_ok(b))

    # Caso 2: red escasa -> una sola propuesta con reason.
    s, b = req("GET", "/recommendations?product=cafe")
    check("escasa-status", 200, s)
    check("escasa-una-propuesta", ["chocolate"], ids(b))
    check("escasa-reason", True, reasons_ok(b))

    # Caso 3: grupos separados -> no se mezclan con el grupo de pan.
    s, b = req("GET", "/recommendations?product=pan")
    check("separados-no-mezcla", True,
          not (set(ids(b)) & {"cafe", "chocolate", "aislado"}))

    # Caso 5: limit fuera de 1..10 o no numérico -> 422.
    for limit in ("0", "99", "-1", "abc"):
        s, _ = req("GET", f"/recommendations?product=pan&limit={limit}")
        check(f"limit-invalido-{limit}", 422, s)

    # limit=1 recorta la lista (rango válido 1..10).
    s, b = req("GET", "/recommendations?product=pan&limit=1")
    check("limit-1-recorta", ["leche"], ids(b))

    total = len(RESULTS)
    passed = sum(RESULTS)
    print(f"TOTAL|{passed}/{total}|{'PASS' if passed == total else 'FAIL'}")
    raise SystemExit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
