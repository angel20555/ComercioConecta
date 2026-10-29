import { useEffect, useState } from "react";
import {
  createProduct,
  createRel,
  listProducts,
  listRels,
  type RelItem,
} from "../api/client";

type Props = { onChanged: () => void };

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "error desconocido";
}

export default function Ledger({ onChanged }: Props) {
  const [products, setProducts] = useState<string[]>([]);
  const [rels, setRels] = useState<RelItem[]>([]);
  const [pid, setPid] = useState("pan");
  const [source, setSource] = useState("pan");
  const [target, setTarget] = useState("leche");
  const [weight, setWeight] = useState("3");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cargando, setCargando] = useState(true);

  async function refresh(): Promise<void> {
    try {
      const p = await listProducts();
      setProducts(p.products);
      const r = await listRels();
      setRels(r.relationships);
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function altaProducto(): Promise<void> {
    setInfo(null);
    setError(null);
    setBusy(true);
    try {
      const r = await createProduct(pid.trim());
      setInfo(`Producto agregado: ${r.id}`);
      setPid("");
      await refresh();
      onChanged();
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function altaRel(): Promise<void> {
    setInfo(null);
    setError(null);
    setBusy(true);
    try {
      const w = Number(weight);
      const r = await createRel(source.trim(), target.trim(), w);
      setInfo(
        `Relación agregada: ${r.source} y ${r.target}, ${r.weight} ${
          r.weight === 1 ? "venta juntos" : "ventas juntos"
        }.`,
      );
      await refresh();
      onChanged();
    } catch (e: unknown) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="registro-titulo">
      <div className="panel-head panel-head--registro">
        <h2 id="registro-titulo">Mostrador</h2>
        <p className="hint">Carga la red del barrio</p>
      </div>

      <div className="panel-body">
        <div className="step">
          <span className="step-num" aria-hidden="true">
            1
          </span>
          <div>
            <h3>Producto</h3>
            <p>El nombre tal como lo pide el vecino.</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void altaProducto();
          }}
        >
          <label className="field">
            <span>Nombre del producto</span>
            <input
              className="input"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              placeholder="pan"
              autoComplete="off"
            />
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            Agregar producto
          </button>
        </form>

        <div className="divider" />

        <div className="step">
          <span className="step-num" aria-hidden="true">
            2
          </span>
          <div>
            <h3>Relación</h3>
            <p>Dos productos que salen juntos y cuántas veces.</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void altaRel();
          }}
        >
          <div className="field-grid">
            <label className="field">
              <span>Producto A</span>
              <input
                className="input"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="pan"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Producto B</span>
              <input
                className="input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="leche"
                autoComplete="off"
              />
            </label>
          </div>
          <label className="field">
            <span>Veces que se vendieron juntos</span>
            <input
              className="input"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="3"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            Agregar relación
          </button>
        </form>

        {info !== null && (
          <p className="notice" role="status">
            {info}
          </p>
        )}
        {error !== null && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        <div className="list-title">
          Productos en la red <span>{cargando ? "…" : products.length}</span>
        </div>
        {cargando ? (
          <p className="empty-copy">Cargando…</p>
        ) : products.length === 0 ? (
          <p className="empty-copy">Todavía no hay productos registrados.</p>
        ) : (
          <ul className="chips">
            {products.map((p) => (
              <li className="chip" key={p}>
                {p}
              </li>
            ))}
          </ul>
        )}

        <div className="list-title">
          Relaciones <span>{cargando ? "…" : rels.length}</span>
        </div>
        {cargando ? (
          <p className="empty-copy">Cargando…</p>
        ) : rels.length === 0 ? (
          <p className="empty-copy">
            Una relación une dos productos que la gente compra junta.
          </p>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th scope="col">Producto A</th>
                <th scope="col">Producto B</th>
                <th scope="col">Veces</th>
              </tr>
            </thead>
            <tbody>
              {rels.map((r) => (
                <tr key={`${r.source}-${r.target}`}>
                  <td>{r.source}</td>
                  <td>{r.target}</td>
                  <td>{r.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
