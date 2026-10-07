from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import network, products, relationships

app = FastAPI(title="ComercioConecta")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(relationships.router)
app.include_router(network.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "ComercioConecta API — red comercial de tiendas de barrio"}
