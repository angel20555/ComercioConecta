"""Acceptance F4: panel comercial demostrable (flujo punta a punta + regresión).

Uso (detén cualquier backend que tengas en el puerto 8000):
    cd /ruta/al/repo
    python scripts/acceptance/acceptanceF4.py

El script levanta su propio uvicorn en 127.0.0.1:8000 usando backend/venv,
reinicia el backend entre fases y lo apaga siempre. Después ejecuta
acceptanceF1/F2/F3 y `npm run build`.

Casos del plan F4:
  1. Red vacía: /network, /components, /reachable y /recommendations
     responden 200 + message, nunca 404/500.
  2. Normal punta a punta: registra, consulta la red, explora, agrupa y
     propone (pan -> leche directa y queso a 2 pasos vía leche).
  3. Aislado: 200 + lista vacía + message (no se inventan propuestas).
  4. Inexistente: 404 + detail.
  5. Inválido: 422 exacto (depth, limit, self-loop, pesos, id vacío).
  + Duplicados: 409 exacto.
  + Regresión F1-F3 con backend limpio y verificación de `npm run build`.

Imprime `escenario|esperaba|obtuvo|PASS/FAIL` y sale 0 solo si todo pasa.
"""

import json
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

# 127.0.0.1 y no "localhost": en Windows, localhost resuelve a ::1 y el
# connect() puede quedarse colgado cuando Uvicorn solo escucha en IPv4.
BASE = "http://127.0.0.1:8000"
ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
TIMEOUT = 10
HEALTH_TIMEOUT = 20.0
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


def check(name, expected, actual):
    ok = expected == actual
    RESULTS.append(ok)
    print(f"{name}|esperaba={expected}|obtuvo={actual}|{'PASS' if ok else 'FAIL'}")
    return ok


def port_in_use(port=8000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def backend_python():
    candidates = [
        BACKEND / "venv" / "Scripts" / "python.exe",
        BACKEND / "venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return sys.executable


class Backend:
    def __init__(self):
        self.proc = None
        self.log = None
        self.start_error = ""

    def start(self):
        self.start_error = ""
        self.log = tempfile.TemporaryFile()
        try:
            self.proc = subprocess.Popen(
                [
                    backend_python(), "-m", "uvicorn", "app.main:app",
                    "--host", "127.0.0.1", "--port", "8000",
                    "--log-level", "warning",
                ],
                cwd=BACKEND,
                stdout=self.log,
                stderr=subprocess.STDOUT,
            )
        except OSError as exc:
            self.start_error = str(exc)
            return False

        start = time.time()
        while time.time() - start < HEALTH_TIMEOUT:
            if self.proc.poll() is not None:
                return False
            try:
                with urllib.request.urlopen(BASE + "/health", timeout=2) as resp:
                    if resp.status == 200:
                        return True
            except Exception:
                time.sleep(0.25)
        return False

    def log_tail(self):
        if self.log is None:
            return self.start_error
        self.log.flush()
        self.log.seek(0)
        text = self.log.read().decode("utf-8", "replace").strip()
        return text[-2000:] if text else self.start_error

    def stop(self):
        if self.proc is not None:
            if self.proc.poll() is None:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
                    self.proc.wait(timeout=5)
            self.proc = None
        if self.log is not None:
            self.log.close()
            self.log = None

        start = time.time()
        while port_in_use() and time.time() - start < 10:
            time.sleep(0.2)

    def restart(self):
        self.stop()
        return self.start()


def load(products, edges):
    for pid in products:
        req("POST", "/products", {"id": pid})
    for source, target, weight in edges:
        req("POST", "/relationships",
            {"source": source, "target": target, "weight": weight})


def reachable_map(body):
    return {i["id"]: i for i in (body or {}).get("reachable", [])}


def recommendation_ids(body):
    return [i["id"] for i in (body or {}).get("recommendations", [])]


def reasons_ok(body):
    items = (body or {}).get("recommendations", [])
    return all(str(i.get("reason", "")).strip() for i in items)


def canonical_pairs(edges):
    return {
        (min(e["source"], e["target"]), max(e["source"], e["target"]))
        for e in edges
    }


def run_acceptance(name):
    script = ROOT / "scripts" / "acceptance" / f"acceptance{name}.py"
    try:
        proc = subprocess.run(
            [sys.executable, str(script)],
            cwd=ROOT, capture_output=True, text=True, timeout=180,
        )
    except subprocess.TimeoutExpired:
        check(f"regresion-{name}", "rc=0 y TOTAL PASS", "timeout")
        return

    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    total = ""
    for line in reversed(output.splitlines()):
        if line.startswith("TOTAL|"):
            total = line.strip()
            break

    ok = proc.returncode == 0 and total.endswith("|PASS")
    if not ok:
        print(output)
    summary = total.replace("|", " ") if total else "sin TOTAL"
    RESULTS.append(ok)
    print(f"regresion-{name}|esperaba=TOTAL ... PASS rc=0|"
          f"obtuvo={summary} rc={proc.returncode}|"
          f"{'PASS' if ok else 'FAIL'}")


def run_build():
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if npm is None:
        check("build-frontend", "npm disponible", "npm no encontrado")
        return

    try:
        proc = subprocess.run(
            [npm, "run", "build"],
            cwd=FRONTEND, capture_output=True, text=True, timeout=180,
        )
    except subprocess.TimeoutExpired:
        check("build-frontend", "rc=0", "timeout")
        return

    if proc.returncode != 0:
        print(((proc.stdout or "") + (proc.stderr or "")).strip()[-3000:])
    check("build-frontend", "rc=0", f"rc={proc.returncode}")
    check("build-dist", True, (FRONTEND / "dist" / "index.html").exists())


def main():
    if port_in_use():
        print("preflight-puerto|esperaba=libre|obtuvo=ocupado|FAIL")
        print("Detén el uvicorn que usa 127.0.0.1:8000 y vuelve a ejecutar: "
              "acceptanceF4 levanta y reinicia su propio backend.")
        return 1

    backend = Backend()
    try:
        if not backend.start():
            print(backend.log_tail())
            print("preflight-backend|esperaba=200 ok|obtuvo=sin-arranque|FAIL")
            return 1

        s, b = req("GET", "/health")
        check("preflight-health", (200, {"status": "ok"}), (s, b))

        # Caso 1: red vacía -> 200 + message, nunca 404/500.
        s, b = req("GET", "/network")
        check("vacia-network-status", 200, s)
        check("vacia-network-nodes", [], (b or {}).get("nodes"))
        check("vacia-network-edges", [], (b or {}).get("edges"))
        check("vacia-network-message", True, bool((b or {}).get("message")))

        s, b = req("GET", "/components")
        check("vacia-components-status", 200, s)
        check("vacia-components-count", 0, (b or {}).get("count"))
        check("vacia-components-list", [], (b or {}).get("components"))
        check("vacia-components-message", True, bool((b or {}).get("message")))

        s, b = req("GET", "/reachable?product=pan&depth=2")
        check("vacia-reachable-status", 200, s)
        check("vacia-reachable-list", [], (b or {}).get("reachable"))
        check("vacia-reachable-message", True, bool((b or {}).get("message")))

        s, b = req("GET", "/recommendations?product=pan")
        check("vacia-recommendations-status", 200, s)
        check("vacia-recommendations-list", [], (b or {}).get("recommendations"))
        check("vacia-recommendations-message", True,
              bool((b or {}).get("message")))

        # Caso 2: set demo sintético de barrio.
        products = ["pan", "leche", "queso", "cafe", "arepa", "chocolate"]
        edges = [
            ("pan", "leche", 3),
            ("leche", "queso", 2),
            ("cafe", "arepa", 1),
        ]
        for pid in products:
            s, _ = req("POST", "/products", {"id": pid})
            check(f"alta-{pid}", 201, s)
        for source, target, weight in edges:
            s, _ = req("POST", "/relationships",
                       {"source": source, "target": target, "weight": weight})
            check(f"alta-{source}-{target}", 201, s)

        # Caso 2a: mostrador y red (lo que pinta el canvas).
        s, b = req("GET", "/products")
        check("productos-status", 200, s)
        check("productos-set", set(products), set((b or {}).get("products", [])))

        s, b = req("GET", "/relationships")
        check("relaciones-status", 200, s)
        check("relaciones-count", 3,
              len((b or {}).get("relationships", [])))

        s, b = req("GET", "/network")
        net = b or {}
        net_edges = net.get("edges", [])
        pairs = canonical_pairs(net_edges)
        weights = {(e["source"], e["target"]): e["weight"]
                   for e in net_edges}
        check("red-status", 200, s)
        check("red-undirected", True, net.get("undirected"))
        check("red-nodos", 6, len(net.get("nodes", [])))
        check("red-aristas", 3, len(net_edges))
        check("red-sin-duplicados", 3, len(pairs))
        check("red-aristas-canonicas",
              {("arepa", "cafe"), ("leche", "pan"), ("leche", "queso")},
              pairs)
        check("red-peso-pan-leche", 3, weights.get(("leche", "pan")))

        # Caso 2b: exploración (1 y 2 saltos, simetría).
        s, b = req("GET", "/reachable?product=pan&depth=2")
        reach = reachable_map(b)
        check("reachable-status", 200, s)
        check("reachable-distancias", {"leche": 1, "queso": 2},
              {pid: item["distance"] for pid, item in reach.items()})
        check("reachable-sin-origen", False, "pan" in reach)
        check("reachable-peso-directo", 3,
              reach.get("leche", {}).get("weight"))
        check("reachable-sin-peso-2saltos", None,
              reach.get("queso", {}).get("weight"))

        s, b = req("GET", "/reachable?product=queso&depth=2")
        reach_q = reachable_map(b)
        check("simetria-status", 200, s)
        check("simetria-distancias", {"leche": 1, "pan": 2},
              {pid: item["distance"] for pid, item in reach_q.items()})

        # Caso 2c: componentes separadas.
        s, b = req("GET", "/components")
        comps = [sorted(c) for c in (b or {}).get("components", [])]
        check("componentes-status", 200, s)
        check("componentes-count", 3, (b or {}).get("count"))
        check("componentes-grupos", True,
              ["arepa", "cafe"] in comps
              and ["chocolate"] in comps
              and ["leche", "pan", "queso"] in comps)

        # Caso 2d: propuesta desde pan (directa + 2 pasos con via/reason).
        s, b = req("GET", "/recommendations?product=pan")
        recs = (b or {}).get("recommendations", [])
        ids = [i["id"] for i in recs]
        by_id = {i["id"]: i for i in recs}
        check("propuesta-status", 200, s)
        check("propuesta-ids", ["leche", "queso"], ids)
        check("propuesta-primero-leche", "leche", ids[0] if ids else None)
        check("propuesta-sin-origen", False, "pan" in ids)
        check("propuesta-reasons", True, reasons_ok(b))
        check("propuesta-directa-distance", 1,
              by_id.get("leche", {}).get("distance"))
        check("propuesta-2saltos-via", "leche",
              by_id.get("queso", {}).get("via"))
        check("propuesta-2saltos-distance", 2,
              by_id.get("queso", {}).get("distance"))
        check("propuesta-2saltos-reason", True,
              "2 pasos" in str(by_id.get("queso", {}).get("reason", "")))

        s, b = req("GET", "/recommendations?product=queso")
        ids_q = recommendation_ids(b)
        check("simetria-propuesta-status", 200, s)
        check("simetria-propuesta-set", {"pan", "leche"}, set(ids_q))
        check("simetria-propuesta-sin-origen", False, "queso" in ids_q)
        check("simetria-propuesta-reasons", True, reasons_ok(b))

        # Caso 3: aislado -> 200 + lista vacía + message.
        s, b = req("GET", "/reachable?product=chocolate&depth=2")
        check("aislado-reachable-status", 200, s)
        check("aislado-reachable-list", [], (b or {}).get("reachable"))
        check("aislado-reachable-message", True,
              bool((b or {}).get("message")))

        s, b = req("GET", "/recommendations?product=chocolate")
        check("aislado-propuesta-status", 200, s)
        check("aislado-propuesta-list", [], (b or {}).get("recommendations"))
        check("aislado-propuesta-message", True,
              bool((b or {}).get("message")))

        # Caso 4: inexistente -> 404 + detail.
        s, b = req("GET", "/reachable?product=fantasma&depth=2")
        check("inexistente-reachable-status", 404, s)
        check("inexistente-reachable-detail", True,
              bool((b or {}).get("detail")))

        s, b = req("GET", "/recommendations?product=fantasma")
        check("inexistente-propuesta-status", 404, s)
        check("inexistente-propuesta-detail", True,
              bool((b or {}).get("detail")))

        s, b = req("POST", "/relationships",
                   {"source": "pan", "target": "fantasma", "weight": 1})
        check("inexistente-relacion-status", 404, s)
        check("inexistente-relacion-detail", True,
              bool((b or {}).get("detail")))

        # Caso 5: inválido -> 422 exacto.
        for depth in ("0", "99", "abc"):
            s, _ = req("GET", f"/reachable?product=pan&depth={depth}")
            check(f"depth-invalido-{depth}", 422, s)
        for limit in ("0", "99", "abc"):
            s, _ = req("GET", f"/recommendations?product=pan&limit={limit}")
            check(f"limit-invalido-{limit}", 422, s)

        s, _ = req("POST", "/relationships",
                   {"source": "pan", "target": "pan", "weight": 1})
        check("self-loop", 422, s)
        for weight in (0, -1, "x"):
            s, _ = req("POST", "/relationships",
                       {"source": "pan", "target": "arepa", "weight": weight})
            check(f"peso-invalido-{weight}", 422, s)
        s, _ = req("POST", "/products", {"id": ""})
        check("producto-vacio", 422, s)

        # Duplicados -> 409 exacto (producto y relación en orden inverso).
        s, _ = req("POST", "/products", {"id": "pan"})
        check("duplicado-producto", 409, s)
        s, _ = req("POST", "/relationships",
                   {"source": "leche", "target": "pan", "weight": 3})
        check("duplicado-relacion-inversa", 409, s)

        # Los bordes no deben alterar el grafo.
        s, b = req("GET", "/network")
        check("post-bordes-nodos", 6, len((b or {}).get("nodes", [])))
        check("post-bordes-aristas", 3, len((b or {}).get("edges", [])))

        # Regresión F1-F3, cada una con backend recién arrancado.
        for name in ("F1", "F2", "F3"):
            if not backend.restart():
                print(backend.log_tail())
                check(f"regresion-{name}", "backend limpio", "sin-arranque")
                continue
            run_acceptance(name)

        backend.stop()
        run_build()
    finally:
        backend.stop()

    total = len(RESULTS)
    passed = sum(RESULTS)
    print(f"TOTAL|{passed}/{total}|{'PASS' if passed == total else 'FAIL'}")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
