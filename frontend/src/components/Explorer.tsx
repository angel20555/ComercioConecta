import { useEffect, useState } from "react";
import {
  getComponents,
  listProducts,
  reachable,
  type ComponentsRes,
  type ReachableItem,
  type ReachableRes,
} from "../api/client";
import ProductPicker from "./ProductPicker";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "error desconocido";
}

const DEPTHS = [
  { value: 1, label: "directo" },
  { value: 2, label: "complementario" },
  { value: 3, label: "ruidoso" },
] as const;

type Group = { distance: number; items: ReachableItem[] };

type Props = { refreshToken: number };

// Agrupa por la distancia que ya calculó el backend. No recorre nada aquí.
function groupByDistance(items: ReachableItem[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const found = groups.find((g) => g.distance === item.distance);
    if (found === undefined) {
      groups.push({ distance: item.distance, items: [item] });
    } else {
      found.items.push(item);
    }
  }
  return groups.sort((a, b) => a.distance - b.distance);
}

export default function Explorer({ refreshToken }: Props) {
  const [pid, setPid] = useState("pan");
  const [products, setProducts] = useState<string[]>([]);
  const [depth, setDepth] = useState<number>(2);
  const [result, setResult] = useState<ReachableRes | null>(null);
  const [comps, setComps] = useState<ComponentsRes | null>(null);
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

  async function consultar(): Promise<void> {
    setError(null);
    setResult(null);
    if (pid.trim() === "") {
      setError("Escribe el nombre de un producto registrado.");
      return;
    }
    setBusy(true);
    try {
      // El backend hace el BFS; aquí solo se pide y se pinta.
      setResult(await reachable(pid.trim(), depth));
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function verComponentes(): Promise<void> {
    setError(null);
    setComps(null);
    setBusy(true);
    try {
      setComps(await getComponents());
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  const groups = result === null ? [] : groupByDistance(result.reachable);

  return (
    <section className="panel" aria-labelledby="explora-titulo">
      <div className="panel-head panel-head--explora">
        <h2 id="explora-titulo">Explora la red</h2>
        <p className="hint">El recorrido lo hace el backend</p>
      </div>

      <div className="panel-body">
        <form
          className="query-row"
          onSubmit={(e) => {
            e.preventDefault();
            void consultar();
          }}
        >
          <ProductPicker
            id="explorer-product"
            label="Producto de interés"
            value={pid}
            options={products}
            onChange={setPid}
            placeholder="pan"
            allowFreeText
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Consultando…" : "Consultar"}
          </button>
        </form>

        <div className="segmented" role="group" aria-label="Saltos a recorrer">
          {DEPTHS.map((d) => (
            <button
              key={d.value}
              type="button"
              className="seg"
              aria-pressed={depth === d.value}
              onClick={() => setDepth(d.value)}
            >
              <strong>{d.value}</strong>
              <small>{d.label}</small>
            </button>
          ))}
        </div>

        <div className="actions">
          <button
            className="btn btn-quiet"
            onClick={() => void verComponentes()}
            disabled={busy}
          >
            Ver grupos del barrio
          </button>
        </div>

        {error !== null && (
          <p className="notice notice--error" role="alert">
            {error}
            <br />
            Revisa que el producto esté registrado en el mostrador.
          </p>
        )}

        <div aria-live="polite">
          {result !== null && (
            <>
              <div className="result-head">
                <h3>Alcanzables desde {result.product}</h3>
                <span>hasta {result.depth} saltos</span>
              </div>

              {result.message != null && result.reachable.length === 0 && (
                <p className="empty-copy">{result.message}</p>
              )}

              {groups.map((g) => (
                <div className="dist-group" key={g.distance}>
                  <p className="dist-label">
                    {g.distance === 1
                      ? "A 1 salto, se compran juntos"
                      : `A ${g.distance} saltos`}
                  </p>
                  <ul className="dist-list">
                    {g.items.map((r) => (
                      <li key={r.id}>
                        <span>{r.id}</span>
                        {r.weight !== undefined && (
                          <span className="weight">{r.weight} veces</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          {comps !== null && (
            <>
              <div className="result-head">
                <h3>Grupos del barrio</h3>
                <span>{comps.count} grupos</span>
              </div>

              {comps.message != null && comps.components.length === 0 && (
                <p className="empty-copy">{comps.message}</p>
              )}

              <ul className="group-list">
                {comps.components.map((c) => (
                  <li className="group" key={c.join("-")}>
                    {c.join(", ")}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {result === null && comps === null && error === null && (
          <p className="empty-copy" style={{ marginTop: 18 }}>
            Consulta qué se vende cerca de un producto, o mira cómo se separan
            los grupos de la red.
          </p>
        )}
      </div>
    </section>
  );
}
