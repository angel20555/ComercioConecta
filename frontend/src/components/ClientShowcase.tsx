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
    requestAnimationFrame(() => {
      document.getElementById("client-product")?.focus();
    });
  }

  return (
    <section className="storefront" aria-labelledby="escaparate-titulo">
      <div className="storefront-hero">
        <div className="storefront-hero-copy">
          <p className="storefront-kicker">La red del barrio</p>
          <h2 id="escaparate-titulo">Encuentra qué se compra junto</h2>
          <p className="storefront-lede">
            Elige un producto y descubre qué suele llevarse con él. La red de
            co-compra del barrio, sin cuentas ni precios.
          </p>
        </div>

        <form
          className="storefront-search"
          onSubmit={(e) => {
            e.preventDefault();
            void buscar(pid);
          }}
        >
          <ProductPicker
            id="client-product"
            label="¿Qué producto buscas?"
            value={pid}
            options={products}
            onChange={setPid}
            placeholder="Escribe un producto…"
            allowFreeText
          />
          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy ? "Buscando…" : "Buscar relacionados"}
          </button>
        </form>
      </div>

      {error !== null && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <div
        className="storefront-feedback"
        aria-live="polite"
        aria-busy={busy}
      >
        {busy && (
          <p className="storefront-loading">Buscando qué se compra junto…</p>
        )}

        {!busy && result !== null && (
          <section
            className="storefront-results"
            aria-labelledby="relacionados-titulo"
          >
            <div className="storefront-result-head">
              <div className="storefront-selected">
                <span
                  className={`product-tile product-tile--${toneFor(0)}`}
                  aria-hidden="true"
                >
                  {initialOf(result.product)}
                </span>
                <div>
                  <p className="storefront-result-kicker">Producto elegido</p>
                  <h3 id="relacionados-titulo">
                    Relacionados con {result.product}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={cambiarProducto}
              >
                Volver al catálogo
              </button>
            </div>

            {result.recommendations.length === 0 ? (
              <div className="storefront-empty">
                <strong>Este producto todavía no tiene relacionados.</strong>
                <p>Prueba con otro producto del catálogo.</p>
              </div>
            ) : (
              <>
                <p className="storefront-result-lede">
                  Estos productos aparecen juntos en la red del barrio.
                </p>
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
              </>
            )}
          </section>
        )}
      </div>

      {products.length > 0 && (
        <section className="storefront-catalog" aria-labelledby="catalogo-titulo">
          <div className="storefront-section-head">
            <div>
              <h3 id="catalogo-titulo">Productos del barrio</h3>
              <p>Elige uno para ver qué se compra junto.</p>
            </div>
            <span className="storefront-count">
              {products.length} productos
            </span>
          </div>

          <ul className="storefront-grid">
            {products.map((producto, index) => (
              <li key={producto}>
                <button
                  type="button"
                  className="store-card"
                  onClick={() => void buscar(producto)}
                  disabled={busy}
                  aria-label={`Ver relacionados de ${producto}`}
                >
                  <span
                    className={`product-tile product-tile--${toneFor(index)}`}
                    aria-hidden="true"
                  >
                    {initialOf(producto)}
                  </span>
                  <span className="store-card-body">
                    <span className="store-card-name">{producto}</span>
                    <span className="store-card-action">Ver relacionados</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length === 0 && !busy && error === null && (
        <div className="storefront-empty">
          <strong>Todavía no hay productos en el barrio.</strong>
          <p>Cuando el mostrador cargue productos, aparecerán aquí.</p>
        </div>
      )}
    </section>
  );
}
