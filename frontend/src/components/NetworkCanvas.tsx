import { useEffect, useState } from "react";
import { getNetwork, type NetworkRes } from "../api/client";

const VERDE = "#1B7A3D";
const PAPEL = "#FAF6EF";
const TINTA = "#1E1B16";

type Props = { refreshToken: number };

type Pos = { x: number; y: number };

// Solo dibujo: posiciones en círculo por orden de llegada.
// Sin cómputo en TS; no usa el peso para ubicar.
function layout(n: number, i: number): Pos {
  const cx = 200;
  const cy = 140;
  const r = 95;
  if (n === 1) return { x: cx, y: cy };
  const a = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export default function NetworkCanvas({ refreshToken }: Props) {
  const [net, setNet] = useState<NetworkRes | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <section
      aria-label="Red comercial"
      style={{ background: PAPEL, color: TINTA, border: `2px solid ${VERDE}`, borderRadius: 8, padding: 12 }}
    >
      <h2 style={{ margin: "0 0 8px" }}>Red (no-dirigida)</h2>
      {error !== null && <p role="alert">{error}</p>}
      {net?.message !== undefined && nodes.length === 0 && <p>{net.message}</p>}
      <svg viewBox="0 0 400 280" width="100%" role="img" aria-label="canvas red">
        {edges.map((e) => {
          const a = pos.get(e.source);
          const b = pos.get(e.target);
          if (a === undefined || b === undefined) return null;
          return (
            <line
              key={`${e.source}-${e.target}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={VERDE}
              strokeWidth={1 + Math.min(e.weight, 5)}
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (p === undefined) return null;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={14} fill="#fff" stroke={VERDE} strokeWidth={2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fill={TINTA}>
                {n.id}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize: 12, margin: "8px 0 0" }}>
        {edges.length} aristas · grosor ∝ peso · líneas sin flecha (simétrica).
      </p>
    </section>
  );
}
