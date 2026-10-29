import { useState } from "react";
import {
  getComponents,
  reachable,
  type ComponentsRes,
  type ReachableRes,
} from "../api/client";

const VERDE = "#1B7A3D";
const PAPEL = "#FAF6EF";
const TINTA = "#1E1B16";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "error desconocido";
}

export default function Explorer() {
  const [pid, setPid] = useState("pan");
  const [depth, setDepth] = useState("2");
  const [result, setResult] = useState<ReachableRes | null>(null);
  const [comps, setComps] = useState<ComponentsRes | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function consultar(): Promise<void> {
    setError(null);
    setResult(null);
    try {
      // El backend hace el BFS; aquí solo se pide y se pinta.
      const r = await reachable(pid.trim(), Number(depth));
      setResult(r);
    } catch (e: unknown) {
      setError(msg(e));
    }
  }

  async function verComponentes(): Promise<void> {
    setError(null);
    setComps(null);
    try {
      setComps(await getComponents());
    } catch (e: unknown) {
      setError(msg(e));
    }
  }

  return (
    <section
      aria-label="Exploración de relaciones"
      style={{ background: PAPEL, color: TINTA, border: `2px solid ${VERDE}`, borderRadius: 8, padding: 12 }}
    >
      <h2 style={{ margin: "0 0 8px" }}>Explora</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13 }}>
        El backend recorre la red; aquí solo se consulta y se muestra.
      </p>

      <label style={{ display: "block", fontSize: 13 }}>
        Producto de interés
        <input
          value={pid}
          onChange={(e) => setPid(e.target.value)}
          placeholder="pan"
          style={{ display: "block", width: "100%", margin: "4px 0 8px" }}
        />
      </label>
      <label style={{ display: "block", fontSize: 13 }}>
        Profundidad
        <select
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
          style={{ display: "block", width: "100%", margin: "4px 0 4px" }}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
        <span style={{ fontSize: 12 }}>
          1=directo, 2=complementario, 3=máximo ruidoso
        </span>
      </label>
      <button
        onClick={() => void consultar()}
        style={{ background: VERDE, color: "#fff", border: 0, borderRadius: 6, padding: "6px 12px", marginTop: 8 }}
      >
        Consultar alcanzables
      </button>{" "}
      <button
        onClick={() => void verComponentes()}
        style={{ background: "#fff", color: VERDE, border: `1px solid ${VERDE}`, borderRadius: 6, padding: "6px 12px" }}
      >
        Ver grupos (componentes)
      </button>

      {error !== null && (
        <p role="alert" style={{ fontSize: 13 }}>
          {error} (404 inexistente, 422 depth fuera de 1..3)
        </p>
      )}

      {result !== null && (
        <>
          <h3>
            Alcanzables desde {result.product} (depth {result.depth})
          </h3>
          {result.message != null && <p style={{ fontSize: 13 }}>{result.message}</p>}
          <ul>
            {result.reachable.map((r) => (
              <li key={r.id}>
                {r.id} — distancia {r.distance}
                {r.weight !== undefined && ` (peso directo ${r.weight})`}
              </li>
            ))}
          </ul>
        </>
      )}

      {comps !== null && (
        <>
          <h3>Grupos ({comps.count})</h3>
          {comps.message != null && <p style={{ fontSize: 13 }}>{comps.message}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {comps.components.map((c) => (
              <p
                key={c.join("-")}
                style={{ border: `1px solid ${VERDE}`, borderRadius: 16, padding: "2px 10px", margin: 0, fontSize: 13 }}
              >
                {c.join(", ")}
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
