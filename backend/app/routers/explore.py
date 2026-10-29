"""Router F2: exploración no-dirigida (BFS y componentes propias).

No hay cómputo de grafo aquí: se delega en ``app.algorithms`` y solo se
traduce el resultado a los códigos HTTP del contrato F2.
"""

from fastapi import APIRouter, HTTPException, Query

from app.algorithms import bfs_reachable, connected_components
from app.routers import graph

router = APIRouter()


@router.get("/reachable")
def get_reachable(
    product: str,
    depth: int = Query(default=2, ge=1, le=3),
) -> dict:
    """Productos alcanzables desde ``product`` hasta ``depth`` saltos."""
    pid = product.strip()

    # Regla global: grafo vacío siempre 200 + message, nunca 404/500.
    if not graph.products():
        return {
            "product": pid,
            "depth": depth,
            "reachable": [],
            "message": "red vacía: cargue productos",
        }

    try:
        distances = bfs_reachable(graph, pid, depth)
    except ValueError as exc:
        if str(exc) == "not-found":
            raise HTTPException(
                status_code=404, detail=f"producto inexistente: {pid!r}"
            )
        raise HTTPException(
            status_code=422, detail=f"depth inválido: {depth}"
        )

    # distances.items() conserva el orden de descubrimiento del BFS
    # (vecinos peso-desc/id-asc), por eso el router no reordena.
    reachable = []
    for node, distance in distances.items():
        item: dict = {"id": node, "distance": distance}
        if distance == 1:
            item["weight"] = graph.adj[pid][node]
        reachable.append(item)

    body: dict = {"product": pid, "depth": depth, "reachable": reachable}
    if not reachable:
        body["message"] = "producto aislado"
    return body


@router.get("/components")
def get_components() -> dict:
    """Componentes conexas del grafo no-dirigido."""
    components = connected_components(graph)
    body: dict = {"components": components, "count": len(components)}
    if not components:
        body["message"] = "red vacía"
    return body
