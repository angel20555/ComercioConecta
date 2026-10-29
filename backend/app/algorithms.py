"""Recorridos propios F2 (sin NetworkX).

Decisiones (F2-B0, brainstorming):
- BFS en vez de DFS: al encargado le importa el *nivel* de cercanía
  (1 = se compra junto, 2 = complementario vía intermediario), no el
  orden de descubrimiento. BFS lo entrega naturalmente.
- ``depth`` cuenta saltos: depth=1 => vecinos directos, depth=2 => hasta
  segundo salto. El origen nunca se incluye.
- Orden determinista: vecinos por peso desc y luego id asc; componentes
  ordenadas por id de su primer elemento.
- Complejidad: O(V + E) por recorrido.
"""

from collections import deque

from app.graph import ProductGraph


def _ordered_neighbors(graph: ProductGraph, pid: str) -> list[str]:
    """Vecinos ordenados: peso desc, luego id asc."""
    return sorted(graph.neighbors(pid), key=lambda n: (-graph.adj[pid][n], n))


def bfs_reachable(
    graph: ProductGraph, origin: str, depth: int = 2
) -> dict[str, int]:
    """Productos alcanzables desde ``origin`` hasta ``depth`` saltos.

    Devuelve ``{producto: distancia}`` sin incluir el origen.
    ValueError("not-found") si el origen no existe.
    """
    if origin not in graph.adj:
        raise ValueError("not-found")
    if depth < 1:
        raise ValueError("invalid-depth")

    distances: dict[str, int] = {origin: 0}
    queue: deque[str] = deque([origin])
    while queue:
        current = queue.popleft()
        if distances[current] >= depth:
            continue
        for neighbor in _ordered_neighbors(graph, current):
            if neighbor in distances:
                continue
            distances[neighbor] = distances[current] + 1
            queue.append(neighbor)

    del distances[origin]
    return distances


def connected_components(graph: ProductGraph) -> list[list[str]]:
    """Componentes conexas del grafo no-dirigido, ordenadas y deterministas."""
    seen: set[str] = set()
    components: list[list[str]] = []

    for start in graph.products():
        if start in seen:
            continue
        component: list[str] = []
        queue: deque[str] = deque([start])
        seen.add(start)
        while queue:
            current = queue.popleft()
            component.append(current)
            for neighbor in _ordered_neighbors(graph, current):
                if neighbor in seen:
                    continue
                seen.add(neighbor)
                queue.append(neighbor)
        components.append(sorted(component))

    return sorted(components, key=lambda c: c[0])
