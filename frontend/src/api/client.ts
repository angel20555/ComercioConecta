export const API_BASE = "http://localhost:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${path} -> ${res.status}`);
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
