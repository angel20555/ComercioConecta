export const API_BASE = "http://127.0.0.1:8000";

const TIMEOUT_MS = 8000;

type ErrorDetail = string | { msg?: string }[];

// En Windows, "localhost" puede resolver a ::1 y quedarse colgado si Uvicorn
// escucha solo IPv4; por eso la app apunta a 127.0.0.1 y corta a los 8 s.
async function request(path: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: ctrl.signal });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(
        `La API no respondió en ${TIMEOUT_MS / 1000} s. Revisa que el backend siga corriendo en ${API_BASE}.`,
      );
    }
    throw new Error(
      `No se pudo conectar con la API en ${API_BASE}. Detalle: ${
        e instanceof Error ? e.message : "error desconocido"
      }`,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

// Convierte el error del backend (detail string o lista de Pydantic) en algo
// legible. No hay lógica de grafo aquí.
async function fail(res: Response, method: string, path: string): Promise<never> {
  let detail: ErrorDetail | undefined;
  try {
    const body = (await res.json()) as { detail?: ErrorDetail };
    detail = body.detail;
  } catch {
    detail = undefined;
  }

  let texto = "";
  if (typeof detail === "string") {
    texto = detail;
  } else if (Array.isArray(detail)) {
    texto = detail
      .map((d) => (typeof d.msg === "string" ? d.msg : ""))
      .filter(Boolean)
      .join(". ");
  }

  const base = `La API respondió ${res.status} en ${method} ${path}`;
  throw new Error(texto === "" ? base : `${base}: ${texto}`);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(path);
  if (!res.ok) {
    return fail(res, "GET", path);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return fail(res, "POST", path);
  }
  return (await res.json()) as T;
}

// Tipos F1: espejo exacto del contrato backend, sin cómputo.
export type ProductsRes = { products: string[] };
export type ProductRes = { id: string };
export type RelItem = { source: string; target: string; weight: number };
export type RelationshipsRes = { relationships: RelItem[] };
export type NetworkRes = {
  nodes: { id: string }[];
  edges: RelItem[];
  undirected?: boolean;
  message?: string;
};

export function listProducts(): Promise<ProductsRes> {
  return apiGet<ProductsRes>("/products");
}

export function createProduct(id: string): Promise<ProductRes> {
  return apiPost<ProductRes>("/products", { id });
}

export function listRels(): Promise<RelationshipsRes> {
  return apiGet<RelationshipsRes>("/relationships");
}

export function createRel(
  source: string,
  target: string,
  weight: number,
): Promise<RelItem> {
  return apiPost<RelItem>("/relationships", { source, target, weight });
}

export function getNetwork(): Promise<NetworkRes> {
  return apiGet<NetworkRes>("/network");
}

// Tipos F2: espejo exacto del contrato backend, sin cómputo.
export type ReachableItem = { id: string; distance: number; weight?: number };
export type ReachableRes = {
  product: string;
  depth: number;
  reachable: ReachableItem[];
  message?: string;
};
export type ComponentsRes = {
  components: string[][];
  count: number;
  message?: string;
};

export function reachable(
  product: string,
  depth?: number,
): Promise<ReachableRes> {
  const q = depth === undefined ? "" : `&depth=${depth}`;
  return apiGet<ReachableRes>(
    `/reachable?product=${encodeURIComponent(product)}${q}`,
  );
}

export function getComponents(): Promise<ComponentsRes> {
  return apiGet<ComponentsRes>("/components");
}
