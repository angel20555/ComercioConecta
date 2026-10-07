import { useEffect, useState } from "react";
import {
  createProduct,
  createRel,
  listProducts,
  listRels,
  type RelItem,
} from "../api/client";

const VERDE = "#1B7A3D";
const PAPEL = "#FAF6EF";
const TINTA = "#1E1B16";

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

  async function refresh(): Promise<void> {
    try {
      const p = await listProducts();
      setProducts(p.products);
      const r = await listRels();
      setRels(r.relationships);
    } catch (e: unknown) {
      setError(msg(e));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function altaProducto(): Promise<void> {
    setInfo(null);
    setError(null);
    try {
      const r = await createProduct(pid.trim());
      setInfo(`POST /products -> 201 ${r.id}`);
      setPid("");
      await refresh();
      onChanged();
    } catch (e: unknown) {
      setError(msg(e));
    }
  }

  async function altaRel(): Promise<void> {
    setInfo(null);
    setError(null);
    try {
      const w = Number(weight);
      const r = await createRel(source.trim(), target.trim(), w);
      setInfo(`POST /relationships -> 201 ${r.source}-${r.target} w=${r.weight}`);
      await refresh();
      onChanged();
    } catch (e: unknown) {
      setError(msg(e));
    }
  }

  return (
    <section
      aria-label="Registro comercial"
      style={{ background: PAPEL, color: TINTA, border: `2px solid ${VERDE}`, borderRadius: 8, padding: 12 }}
    >
      <h2 style={{ margin: "0 0 8px" }}>Registro</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13 }}>
        Datos sintéticos de barrio: pan, leche, queso, café.
      </p>

      <label style={{ display: "block", fontSize: 13 }}>
        Producto
        <input
          value={pid}
          onChange={(e) => setPid(e.target.value)}
          placeholder="pan"
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        />
      </label>
      <button
        onClick={() => void altaProducto()}
        style={{ background: VERDE, color: "#fff", border: 0, borderRadius: 6, padding: "6px 12px" }}
      >
        Crear producto
      </button>

      <hr style={{ margin: "12px 0" }} />

      <label style={{ display: "block", fontSize: 13 }}>
        Origen
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="pan"
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        />
      </label>
      <label style={{ display: "block", fontSize: 13 }}>
        Destino
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="leche"
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        />
      </label>
      <label style={{ display: "block", fontSize: 13 }}>
        Peso (frecuencia &gt; 0)
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="3"
          inputMode="numeric"
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        />
      </label>
      <button
        onClick={() => void altaRel()}
        style={{ background: VERDE, color: "#fff", border: 0, borderRadius: 6, padding: "6px 12px" }}
      >
        Crear relación
      </button>

      {info !== null && <p style={{ fontSize: 13 }}>{info}</p>}
      {error !== null && (
        <p role="alert" style={{ fontSize: 13 }}>
          {error} (201 crea, 409 duplicado, 404 inexistente, 422 inválido)
        </p>
      )}

      <h3>Productos ({products.length})</h3>
      <ul>
        {products.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h3>Relaciones ({rels.length})</h3>
      <ul>
        {rels.map((r) => (
          <li key={`${r.source}-${r.target}`}>
            {r.source} — {r.target} (w={r.weight})
          </li>
        ))}
      </ul>
    </section>
  );
}
