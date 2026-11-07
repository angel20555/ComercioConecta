"""Recomendador F3: regla explícita, sin ML ni NetworkX.

Regla F3-B0 (opción b del plan, simétrica):
1. Candidatos = ``bfs_reachable(origin, 2)``; el origen se excluye.
2. ``score = peso_directo`` si está a 1 salto; si está a 2 saltos,
   ``score = peso_via * 0.7``. En ambos casos se suma
   ``0.1 * vecinos_comunes``.
3. Orden: ``score`` desc, peso de apoyo desc, ``id`` asc.
4. ``limit`` válido 1..10, por defecto 5.
5. Cada ítem trae un ``reason`` no vacío; a 2 saltos se cita el
   intermediario y se expone ``via``.

Para un candidato a 2 saltos se elige el intermediario que maximiza la
arista intermediario→candidato (peso de apoyo); desempata la arista
origen→intermediario y luego el ``id`` del intermediario. Así el
``reason`` cita el peso que realmente sostiene la propuesta y el
resultado es determinista.

Sesgos documentados en README:
- favorece la co-compra frecuente y los productos con más vecinos en
  común;
- penaliza lo indirecto con el factor 0.7;
- nunca inventa: un producto sin camino demostrable no aparece y un
  producto aislado devuelve lista vacía;
- ``depth > 2`` se ignora: no se recomienda "todo el catálogo".

Nota de integración: el router debe comprobar ``graph.products()`` antes de
llamar, para respetar la precedencia de grafo vacío -> 200 + ``message``.
"""

from app.algorithms import bfs_reachable
from app.graph import ProductGraph

FACTOR_SALTO_2 = 0.7
PESO_VECINO_COMUN = 0.1
MAX_LIMIT = 10


def _weight_text(weight: float) -> str:
    """3.0 -> "3"; 2.5 -> "2.5" (para un reason legible)."""
    return str(int(weight)) if float(weight).is_integer() else str(weight)


def _common_neighbors(graph: ProductGraph, a: str, b: str) -> int:
    """Vecinos que comparten ``a`` y ``b`` (sin contar a ninguno de los dos)."""
    return len(set(graph.adj[a]) & set(graph.adj[b]))


def _best_via(
    graph: ProductGraph, origin: str, candidate: str
) -> tuple[str, float]:
    """Mejor intermediario para un candidato que está a exactamente 2 saltos.

    Prioridad: peso intermediario→candidato desc, peso origen→intermediario
    desc, id del intermediario asc.
    """
    best: tuple[tuple[float, float, str], str, float] | None = None
    for via in graph.adj[origin]:
        if candidate not in graph.adj[via]:
            continue
        support = graph.adj[via][candidate]
        entry = graph.adj[origin][via]
        key = (-support, -entry, via)
        if best is None or key < best[0]:
            best = (key, via, support)

    # Un candidato a distancia 2 siempre tiene al menos un intermediario.
    if best is None:
        raise RuntimeError("candidato a 2 saltos sin intermediario")
    return best[1], best[2]


def recommend(
    graph: ProductGraph, origin: str, limit: int = 5
) -> list[dict]:
    """Recomienda productos con camino demostrable desde ``origin``.

    ``ValueError("invalid-limit")`` si ``limit`` no es un entero 1..10.
    ``ValueError("not-found")`` si ``origin`` no existe (lo propaga el BFS).
    """
    if (
        isinstance(limit, bool)
        or not isinstance(limit, int)
        or not 1 <= limit <= MAX_LIMIT
    ):
        raise ValueError("invalid-limit")

    distances = bfs_reachable(graph, origin, 2)
    ranked: list[tuple[float, float, str, dict]] = []

    for candidate, distance in distances.items():
        common = _common_neighbors(graph, origin, candidate)
        if distance == 1:
            support = graph.adj[origin][candidate]
            score = support + PESO_VECINO_COMUN * common
            item: dict = {
                "id": candidate,
                "score": round(score, 2),
                "reason": (
                    f"relación directa peso {_weight_text(support)} "
                    "(compra conjunta frecuente)"
                ),
                "distance": 1,
            }
        else:
            via, support = _best_via(graph, origin, candidate)
            score = support * FACTOR_SALTO_2 + PESO_VECINO_COMUN * common
            item = {
                "id": candidate,
                "score": round(score, 2),
                "reason": (
                    f"alcance a 2 pasos vía {via} "
                    f"(peso {_weight_text(support)})"
                ),
                "distance": 2,
                "via": via,
            }

        ranked.append((score, support, candidate, item))

    ranked.sort(key=lambda row: (-row[0], -row[1], row[2]))
    return [row[3] for row in ranked[:limit]]
