"""Router F1: productos."""

from fastapi import APIRouter, HTTPException

from app.routers import graph
from app.schemas import ProductIn

router = APIRouter()


@router.post("/products", status_code=201)
def create_product(payload: ProductIn) -> dict[str, str]:
    pid = payload.id.strip()
    try:
        graph.add_product(pid)
    except ValueError as e:
        if str(e) == "duplicate":
            raise HTTPException(
                status_code=409, detail=f"producto duplicado: {pid!r}"
            )
        raise HTTPException(
            status_code=422, detail=f"id de producto inválido: {payload.id!r}"
        )
    return {"id": pid}


@router.get("/products")
def list_products() -> dict[str, list[str]]:
    return {"products": graph.products()}
