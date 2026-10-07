"""Router F1: red completa (solo lectura, sin cómputo adicional)."""

from fastapi import APIRouter

from app.routers import graph

router = APIRouter()


@router.get("/network")
def get_network() -> dict:
    return graph.to_network()
