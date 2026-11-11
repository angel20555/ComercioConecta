import { useEffect, useState } from "react";
import {
  getRecommendations,
  listProducts,
  type RecommendationsRes,
} from "../api/client";
import ProductPicker from "./ProductPicker";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "error desconocido";
}

const LIMITS = Array.from({ length: 10 }, (_, i) => i + 1);

type Props = { refreshToken: number };

export default function Recommend({ refreshToken }: Props) {
  const [pid, setPid] = useState("pan");
  const [products, setProducts] = useState<string[]>([]);
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState<RecommendationsRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let vivo = true;
    listProducts()
      .then((p) => {
        if (vivo) setProducts(p.products);
      })
      .catch(() => {
        if (vivo) setProducts([]);
      });
    return () => {
      vivo = false;
    };
  }, [refreshToken]);

  async function proponer(): Promise<void> {
    setError(null);
    setResult(null);
    if (pid.trim() === "") {
      setError("Escribe el nombre de un producto registrado.");
      return;
    }
    setBusy(true);
    try {
      // La regla F3 vive en el backend; aquí solo se pide y se pinta.
      setResult(await getRecommendations(pid.trim(), limit));
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="propuesta-titulo">
      <div className="panel-head panel-head--propuesta">
        <h2 id="propuesta-titulo">Propuesta comercial</h2>
        <p className="hint">La regla la aplica el backend</p>
      </div>

      <div className="panel-body">
        <form
          className="query-row rec-query"
          onSubmit={(e) => {
            e.preventDefault();
            void proponer();
          }}
        >
          <ProductPicker
            id="recommend-product"
            label="Producto de interés"
            value={pid}
            options={products}
            onChange={setPid}
            placeholder="pan"
            allowFreeText
          />

          <div className="field rec-limit-field">
            <label className="picker-label" htmlFor="recommend-limit">
              Cantidad
            </label>
            <select
              id="recommend-limit"
              className="select"
              value={limit}
              onChange={(e) => {
                // El resultado anterior ya no corresponde a esta cantidad.
                setLimit(Number(e.target.value));
                setResult(null);
              }}
            >
              {LIMITS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Proponiendo…" : "Proponer"}
          </button>
        </form>

        {error !== null && (
          <p className="notice notice--error" role="alert">
            {error}
            <br />
            Revisa que el producto esté registrado en el mostrador.
          </p>
        )}

        <div aria-live="polite" aria-busy={busy}>
          {busy && <p className="empty-copy">Consultando propuestas…</p>}

          {result !== null && (
            <>
              <div className="result-head">
                <h3>Propuestas desde {result.product}</h3>
                <span>
                  {result.recommendations.length === 1
                    ? "1 propuesta"
                    : `${result.recommendations.length} propuestas`}
                </span>
              </div>

              {result.recommendations.length === 0 ? (
                <p className="empty-copy">
                  {result.message ??
                    "El backend no devolvió propuestas para este producto."}
                </p>
              ) : (
                <ol className="rec-list">
                  {result.recommendations.map((r, index) => (
                    <li className="rec-card" key={r.id}>
                      <div className="rec-card-top">
                        <span className="rec-name">
                          <span className="rec-rank" aria-hidden="true">
                            {index + 1}
                          </span>
                          {r.id}
                        </span>
                        <span className="rec-score">
                          <small>Puntaje </small>
                          {r.score}
                        </span>
                      </div>

                      <div className="rec-meta">
                        <span className="chip">Distancia {r.distance}</span>
                        {r.via !== undefined && r.via !== "" && (
                          <span className="chip chip--via">Vía {r.via}</span>
                        )}
                      </div>

                      <p className="rec-reason">{r.reason}</p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        {result === null && error === null && !busy && (
          <p className="empty-copy rec-intro">
            Consulta un producto registrado y el backend propondrá relaciones
            demostrables, con su justificación.
          </p>
        )}
      </div>
    </section>
  );
}
