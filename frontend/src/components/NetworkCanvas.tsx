import { useEffect, useState } from "react";
import { getNetwork, type NetworkRes } from "../api/client";

type Props = { refreshToken: number };

type Pos = { x: number; y: number };

const CX = 330;
const CY = 190;

// Solo dibujo: posiciones en círculo por orden de llegada.
// El peso decide el grosor, nunca la posición. Sin cómputo de grafo en TS.
function layout(n: number, i: number): Pos {
  if (n === 1) return { x: CX, y: CY };
  // Dos productos se leen mejor lado a lado que en vertical.
  if (n === 2) return { x: CX + (i === 0 ? -150 : 150), y: CY };
  const r = n <= 4 ? 110 : n <= 8 ? 138 : 150;
  const a = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

export default function NetworkCanvas({ refreshToken }: Props) {
  const [net, setNet] = useState<NetworkRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    getNetwork()
      .then((d) => {
        if (vivo) {
          setNet(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e.message : "error desconocido");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [refreshToken]);

  const nodes = net?.nodes ?? [];
  const edges = net?.edges ?? [];
  const pos = new Map<string, Pos>();
  nodes.forEach((n, i) => pos.set(n.id, layout(nodes.length, i)));

  return (
    <section className="panel" aria-labelledby="red-titulo">
      <div className="panel-head">
        <h2 id="red-titulo">La red del barrio</h2>
        <p className="stats">
          <span>{cargando ? "…" : nodes.length} productos</span>
          <span>{cargando ? "…" : edges.length} relaciones</span>
        </p>
      </div>

      <div className="canvas-body">
        {error !== null && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        {cargando ? (
          <div className="canvas-empty">
            <strong>Cargando la red…</strong>
          </div>
        ) : nodes.length === 0 ? (
          <div className="canvas-empty">
            <strong>Todavía no hay red que mostrar</strong>
            <p className="empty-copy" style={{ color: "inherit", margin: "0 auto" }}>
              Registra dos productos en el mostrador y únelos con una relación.
            </p>
          </div>
        ) : (
          <svg
            viewBox="0 0 660 380"
            role="img"
            aria-label={`Red con ${nodes.length} productos y ${edges.length} relaciones; las líneas no tienen dirección.`}
          >
            {edges.map((e) => {
              const a = pos.get(e.source);
              const b = pos.get(e.target);
              if (a === undefined || b === undefined) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
              const nx = (-(b.y - a.y) / len) * 12;
              const ny = ((b.x - a.x) / len) * 12;
              return (
                <g key={`${e.source}-${e.target}`}>
                  <line
                    className="edge"
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    strokeWidth={1.5 + Math.min(e.weight, 6)}
                    pathLength={1}
                  />
                  <text
                    className="edge-label"
                    x={mx + nx}
                    y={my + ny}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {e.weight}
                  </text>
                </g>
              );
            })}

            {nodes.map((n) => {
              const p = pos.get(n.id);
              if (p === undefined) return null;
              const arriba = p.y < CY;
              return (
                <g className="node" key={n.id}>
                  <circle cx={p.x} cy={p.y} r={22} />
                  <text
                    x={p.x}
                    y={arriba ? p.y - 31 : p.y + 38}
                    textAnchor="middle"
                  >
                    {n.id}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <p className="canvas-foot">
        El grosor de la línea crece con las veces que se venden juntos. Las
        líneas no tienen flecha: la relación vale en ambos sentidos.
      </p>
    </section>
  );
}
