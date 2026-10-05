class ProductGraph:
    """Red de co-compra. Stub T0: solo contenedor vacío."""

    adj: dict[str, dict[str, float]]

    def __init__(self) -> None:
        self.adj = {}

    def add_product(self, pid: str) -> None:
        """Stub T0: firma real se fija en F1. No implementado aún."""
        raise NotImplementedError("T0 stub: se implementa en F1-B1")

    def add_edge(self, a: str, b: str, weight: float = 1) -> None:
        """Stub T0: firma real se fija en F1. No implementado aún."""
        raise NotImplementedError("T0 stub: se implementa en F1-B1")
