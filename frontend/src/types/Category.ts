export type TipoCategoria = "INGRESO" | "GASTO" | "AHORRO";

export interface Category {
  id_categoria: number;
  id_usuario?: number | null;
  nombre: string;
  tipo: TipoCategoria;
  icono?: string | null;
  color?: string | null;
  es_predeterminada?: boolean;
  created_at?: string;
}

export interface CreateCategoryPayload {
  nombre: string;
  tipo: TipoCategoria;
  icono?: string;
  color?: string;
}

export interface UpdateCategoryPayload {
  nombre?: string;
  tipo?: TipoCategoria;
  icono?: string;
  color?: string;
}

export type CategoryCreateInput = CreateCategoryPayload;
export type CategoryUpdateInput = UpdateCategoryPayload;
