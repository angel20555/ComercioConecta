import { useEffect, useState } from "react";
import {
  getRecommendations,
  listProducts,
  type RecommendationsRes,
} from "../api/client";
import ProductPicker from "./ProductPicker";

const LIMIT = 6;
const TONES = ["amarillo", "verde", "rojo", "azul"] as const;

type Props = { refreshToken: number };

function initialOf(id: string): string {
  const first = id.trim().charAt(0);
  return first === "" ? "?" : first.toUpperCase();
}

function toneFor(index: number): (typeof TONES)[number] {
  return TONES[index % TONES.length];
}

export default function ClientShowcase({ refreshToken }: Props) {
  const [products, setProducts] = useState<string[]>([]);
  const [pid, setPid] = useState("");
  const [result, setResult] = useState<RecommendationsRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let vivo = true;
    listProducts()
      .then((data) => {
        if (vivo) setProducts(data.products);
      })
      .catch(() => {
        if (vivo) setProducts([]);
      });
    return () => {
      vivo = false;
    };
  }, [refreshToken]);

  async function buscar(producto: string): Promise<void> {
    if (busy) return;

    const limpio = producto.trim();
    setError(null);
    setResult(null);

    if (limpio === "") {
      setError("Escribe o elige un producto para empezar.");
      return;
    }

    setPid(limpio);
    setBusy(true);
    try {
      setResult(await getRecommendations(limpio, LIMIT));
    } catch {
      setError(
        "No pudimos mostrar los relacionados. Revisa el nombre o prueba con otro producto.",
      );
    } finally {
      setBusy(false);
    }
  }

  function cambiarProducto(): void {
    setResult(null);
    setError(null);
    setPid("");
  }

  return (
    <section
      className="panel showcase-panel"
      aria-labelledby="escaparate-titulo"
    >
      <div className="panel-head panel-head--escaparate">
        <h2 id="escaparate-titulo">Encuentra qué se compra junto</h2>
        <p className="hint">Lo que el barrio ya está comprando</p>
      </div>

      <div className="panel-body">
        <p className="showcase-lede">
          Elige un producto y mira qué suele llevarse con él.
        </p>

        <form
          className="showcase-search"
          onSubmit={(e) => {
            e.preventDefault();
            void buscar(pid);
          }}
        >
          <ProductPicker
            id="client-product"
            label="Producto"
            value={pid}
            options={products}
            onChange={setPid}
            placeholder="Escribe un producto…"
            allowFreeText
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Buscando…" : "Ver relacionados"}
          </button>
        </form>

        {error !== null && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        <div aria-live="polite" aria-busy={busy}>
          {busy && (
            <p className="showcase-loading">
              Buscando productos relacionados…
            </p>
          )}

          {!busy && result === null && products.length > 0 && (
            <div className="showcase-quick">
              <h3 className="showcase-quick-title">Productos del barrio</h3>
              <ul className="quick-list">
                {products.map((producto, index) => (
                  <li key={producto}>
                    <button
                      type="button"
                      className="quick-product"
                      onClick={() => void buscar(producto)}
                      aria-label={`Ver relacionados de ${producto}`}
                    >
                      <span
                        className={`product-tile product-tile--mini product-tile--${toneFor(index)}`}
                        aria-hidden="true"
                      >
                        {initialOf(producto)}
                      </span>
                      {producto}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!busy && result !== null && (
            <>
              <div className="showcase-result-head">
                <h3>Relacionados con {result.product}</h3>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={cambiarProducto}
                >
                  Cambiar producto
                </button>
              </div>

              {result.recommendations.length === 0 ? (
                <div className="showcase-empty">
                  <strong>Este producto todavía no tiene relacionados.</strong>
                  <p>Prueba con otro producto del barrio.</p>
                </div>
              ) : (
                <ul className="related-grid">
                  {result.recommendations.map((r, index) => (
                    <li className="related-card" key={r.id}>
                      <span
                        className={`product-tile product-tile--${toneFor(index)}`}
                        aria-hidden="true"
                      >
                        {initialOf(r.id)}
                      </span>

                      <div className="related-content">
                        <h4 className="related-name">{r.id}</h4>
                        <span
                          className={`related-badge ${
                            r.distance === 1
                              ? "related-badge--direct"
                              : "related-badge--indirect"
                          }`}
                        >
                          {r.distance === 1
                            ? "Se compran juntos"
                            : "También te puede interesar"}
                        </span>
                        <button
                          type="button"
                          className="related-link"
                          onClick={() => void buscar(r.id)}
                          aria-label={`Ver relacionados de ${r.id}`}
                        >
                          Ver relacionados
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!busy &&
            result === null &&
            products.length === 0 &&
            error === null && (
              <div className="showcase-empty">
                <strong>Todavía no hay productos en el barrio.</strong>
                <p>Cuando el mostrador cargue productos, aparecerán aquí.</p>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
