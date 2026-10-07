"""Esquemas F1 (Pydantic v2)."""

from pydantic import BaseModel, Field


class ProductIn(BaseModel):
    """Alta de producto. Vacío -> 422 automático por min_length."""

    id: str = Field(min_length=1)


class RelationshipIn(BaseModel):
    """Alta de relación no-dirigida. Peso inválido (<=0, texto) -> 422."""

    source: str = Field(min_length=1)
    target: str = Field(min_length=1)
    weight: int | float = Field(default=1, gt=0)
