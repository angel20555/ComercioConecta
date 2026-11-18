export const API_BASE = "http://127.0.0.1:8000";

const TIMEOUT_MS = 8000;

type ValidationIssue = { msg?: string; loc?: (string | number)[] };
type ErrorDetail = string | ValidationIssue[];

export type ApiErrorKind = "http" | "network" | "timeout";

// Error de API con el estado HTTP accesible para la interfaz. `status` es
// null cuando no hubo respuesta (red caída o tiempo de espera).
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly method: string;
  readonly path: string;
  readonly detail: string | null;

  constructor(params: {
    kind: ApiErrorKind;
    status: number | null;
    method: string;
    path: string;
    detail: string | null;
    message: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.kind = params.kind;
    this.status = params.status;
    this.method = params.method;
    this.path = params.path;
    this.detail = params.detail;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "ocurrió un error inesperado";
}

export function apiErrorStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

// Pista breve para acompañar el error técnico en formularios de consulta.
export function apiErrorHint(error: unknown): string {
  if (!(error instanceof ApiError)) return "";
  switch (error.status) {
    case 404:
      return "Revisa que el producto esté registrado en el mostrador.";
    case 409:
      return "Ese registro ya existe; usa uno distinto o actualiza la vista.";
    case 422:
      return "Revisa los datos del formulario antes de reintentar.";
    default:
      return "";
  }
}

function detailToText(detail: ErrorDetail | undefined): string {
  if (typeof detail === "string") return detail.trim();
  if (!Array.isArray(detail)) return "";

  return detail
    .map((issue) => {
      const field = (issue.loc ?? [])
        .filter((part) => part !== "body")
        .join(".");
      const message = typeof issue.msg === "string" ? issue.msg : "";
      if (field === "") return message;
      return message === "" ? field : `${field}: ${message}`;
    })
    .filter(Boolean)
    .join(". ");
}

// Mensajes entendibles para el usuario, sin perder el estado ni el detalle
// que el backend devolvió para depuración.
function httpErrorMessage(
  status: number,
  method: string,
  path: string,
  detail: string,
): string {
  let resumen: string;
  switch (status) {
    case 404:
      resumen =
        "No se encontró el producto o recurso solicitado; revisa que esté registrado";
      break;
    case 409:
      resumen = "El registro ya existe en la red y no se puede duplicar";
      break;
    case 422:
      resumen =
        "Los datos enviados no son válidos; revisa los campos e inténtalo de nuevo";
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      resumen = "El backend no pudo completar la solicitud";
      break;
    default:
      resumen = "La solicitud no se pudo completar";
  }

  const contexto = `(${status} en ${method} ${path})`;
  return detail === ""
    ? `${resumen} ${contexto}`
    : `${resumen} ${contexto}. Detalle del servidor: ${detail}`;
}

// En Windows, "localhost" puede resolver a ::1 y quedarse colgado si Uvicorn
// escucha solo IPv4; por eso la app apunta a 127.0.0.1 y corta a los 8 s.
async function request(path: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: ctrl.signal });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError({
        kind: "timeout",
        status: null,
        method,
        path,
        detail: null,
        message: `La API no respondió en ${TIMEOUT_MS / 1000} s. Revisa que el backend siga corriendo en ${API_BASE}.`,
      });
    }

    const detalle = e instanceof Error ? e.message : "error desconocido";
    throw new ApiError({
      kind: "network",
      status: null,
      method,
      path,
      detail: detalle,
      message: `No se pudo conectar con la API en ${API_BASE}. Comprueba que el backend esté en marcha. Detalle: ${detalle}`,
    });
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

  const texto = detailToText(detail);
  throw new ApiError({
    kind: "http",
    status: res.status,
    method,
    path,
    detail: texto === "" ? null : texto,
    message: httpErrorMessage(res.status, method, path, texto),
  });
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

// Tipos F3: espejo exacto del contrato backend, sin cómputo.
// El backend ya devuelve el orden y los puntajes; el cliente no los altera.
export type RecommendationItem = {
  id: string;
  score: number;
  reason: string;
  distance: number;
  via?: string;
};

export type RecommendationsRes = {
  product: string;
  recommendations: RecommendationItem[];
  message?: string;
};

export function getRecommendations(
  product: string,
  limit?: number,
): Promise<RecommendationsRes> {
  const q = limit === undefined ? "" : `&limit=${limit}`;
  return apiGet<RecommendationsRes>(
    `/recommendations?product=${encodeURIComponent(product)}${q}`,
  );
}
