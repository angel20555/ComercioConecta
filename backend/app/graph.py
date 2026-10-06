"""Red comercial de co-compra (F1-B1).

Grafo NO-DIRIGIDO simétrico: `add_edge(a, b)` escribe ambas entradas.
Traza manual: pan-leche(3), leche-queso(2) -> neighbors(pan)={leche:3},
neighbors(queso)={leche:2}, edges() == 2 aristas.
"""

import math


class ProductGraph:
    """Contenedor de productos y relaciones de co-compra."""

    adj: dict[str, dict[str, float]]

    def __init__(self) -> None:
        self.adj = {}

    @staticmethod
    def _norm(pid: str) -> str:
        return pid.strip()

    def add_product(self, pid: str) -> None:
        """Registra un producto. ValueError("duplicate"|"invalid-id")."""
        pid = self._norm(pid)
        if not pid:
            raise ValueError("invalid-id")
        if pid in self.adj:
            raise ValueError("duplicate")
        self.adj[pid] = {}

    def add_edge(self, a: str, b: str, weight: float = 1) -> None:
        """Crea la relación simétrica a-b.

        ValueError("not-found" si algún extremo no existe,
        "self-loop" si a == b, "invalid-weight" si peso no es
        número > 0 y finito, "duplicate" si el par ya existe
        en cualquier orden).
        """
        a, b = self._norm(a), self._norm(b)
        if a not in self.adj or b not in self.adj:
            raise ValueError("not-found")
        if a == b:
            raise ValueError("self-loop")
        if isinstance(weight, bool) or not isinstance(weight, (int, float)):
            raise ValueError("invalid-weight")
        if not math.isfinite(weight) or weight <= 0:
            raise ValueError("invalid-weight")
        if b in self.adj[a]:
            raise ValueError("duplicate")
        self.adj[a][b] = weight
        self.adj[b][a] = weight

    def products(self) -> list[str]:
        """Ids ordenados (orden determinista para API y tests)."""
        return sorted(self.adj)

    def neighbors(self, pid: str) -> dict[str, float]:
        """Vecinos simétricos de un producto (copia)."""
        return dict(self.adj[pid])

    def edges(self) -> list[tuple[str, str, float]]:
        """Cada arista no-dirigida una sola vez, ordenada."""
        seen: list[tuple[str, str, float]] = []
        for a in self.adj:
            for b, w in self.adj[a].items():
                if a < b:
                    seen.append((a, b, w))
        return sorted(seen)

    def to_network(self) -> dict:
        """Formato para GET /network (con message si está vacía)."""
        nodes = [{"id": pid} for pid in self.products()]
        edges = [
            {"source": a, "target": b, "weight": w} for a, b, w in self.edges()
        ]
        net: dict = {"nodes": nodes, "edges": edges, "undirected": True}
        if not nodes:
            net["message"] = "red vacía: cargue productos"
        return net
