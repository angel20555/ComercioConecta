"""Router F3: propuesta comercial justificable (regla explícita, sin ML).

No hay cómputo de grafo aquí: se delega en ``app.recommender`` y solo se
traduce el resultado a los códigos HTTP del contrato F3.
"""

from fastapi import APIRouter, HTTPException, Query

from app.recommender import recommend
from app.routers import graph

router = APIRouter()


@router.get("/recommendations")
def get_recommendations(
    product: str,
    limit: int = Query(default=5, ge=1, le=10),
) -> dict:
    """Recomendaciones con camino demostrable desde ``product``."""
    pid = product.strip()

    # Regla global: grafo vacío siempre 200 + message, nunca 404/500
    # (misma precedencia que /reachable en F2).
    if not graph.products():
        return {
            "product": pid,
            "recommendations": [],
            "message": "red vacía: cargue productos",
        }

    try:
        items = recommend(graph, pid, limit)
    except ValueError as exc:
        if str(exc) == "not-found":
            raise HTTPException(
                status_code=404, detail=f"producto inexistente: {pid!r}"
            )
        raise HTTPException(
            status_code=422, detail=f"limit inválido: {limit}"
        )

    body: dict = {"product": pid, "recommendations": items}
    if not items:
        # Aislado o sin camino demostrable: no se inventan propuestas.
        body["message"] = (
            "sin relaciones demostrables: no se inventan recomendaciones"
        )
    return body
