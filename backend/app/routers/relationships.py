"""Router F1: relaciones no-dirigidas de co-compra."""

from fastapi import APIRouter, HTTPException

from app.routers import graph
from app.schemas import RelationshipIn

router = APIRouter()


@router.post("/relationships", status_code=201)
def create_relationship(payload: RelationshipIn) -> dict:
    a, b = payload.source.strip(), payload.target.strip()
    try:
        graph.add_edge(a, b, payload.weight)
    except ValueError as e:
        kind = str(e)
        if kind == "not-found":
            raise HTTPException(
                status_code=404, detail=f"producto inexistente: {a!r} o {b!r}"
            )
        if kind == "duplicate":
            raise HTTPException(
                status_code=409, detail=f"relación duplicada: {a!r}-{b!r}"
            )
        raise HTTPException(
            status_code=422, detail=f"relación inválida ({kind}): {a!r}-{b!r}"
        )
    return {"source": a, "target": b, "weight": payload.weight}


@router.get("/relationships")
def list_relationships() -> dict:
    return {
        "relationships": [
            {"source": a, "target": b, "weight": w} for a, b, w in graph.edges()
        ]
    }
