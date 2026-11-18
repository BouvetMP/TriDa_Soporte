// ¿Qué? Servicio de datos geográficos para el mapa.
// ¿Para qué? Obtener estadísticas y ubicaciones reales de transacciones aisladas por usuario (RS-001).
// ¿Impacto? Alimenta el mapa con límites reales y casteo de tipos explícito para PostgreSQL.

import { queryRaw } from "../../db/queryRaw.js";
import type { MapQueryInput } from "./maps.schemas.js";

type RawLocation = {
  id_transaccion: number;
  monto: string | number;
  tipo_movimiento: string;
  comercio: string | null;
  estado: string;
  score_anomalia: string | number | null;
  ciudad: string | null;
  pais: string | null;
  latitud: string | number;
  longitud: string | number;
  fecha_transaccion: Date;
  nombre_cuenta: string | null;
  nombre_categoria: string | null;
};

function formatRawLocation(item: RawLocation) {
  return {
    id_transaccion: Number(item.id_transaccion),
    monto: Number(item.monto),
    tipo_movimiento: item.tipo_movimiento,
    comercio: item.comercio ?? null,
    estado: item.estado,
    score_anomalia: item.score_anomalia !== null ? Number(item.score_anomalia) : 0,
    ciudad: item.ciudad ?? null,
    pais: item.pais ?? null,
    latitud: Number(item.latitud),
    longitud: Number(item.longitud),
    fecha_transaccion: item.fecha_transaccion,
    nombre_cuenta: item.nombre_cuenta ?? null,
    nombre_categoria: item.nombre_categoria ?? null,
  };
}

export const mapService = {
  async getStats(userId: number) {
    const rows = await queryRaw<
      {
        total_geolocalizadas: string | number;
        ciudades_distintas: string | number;
        paises_distintos: string | number;
        transacciones_riesgo_alto: string | number;
        score_promedio: string | number;
      }[]
    >(
      `
      SELECT
        COUNT(*)::bigint AS total_geolocalizadas,
        COUNT(DISTINCT ciudad)::bigint AS ciudades_distintas,
        COUNT(DISTINCT pais)::bigint AS paises_distintos,
        COUNT(*) FILTER (WHERE t.score_anomalia >= 50)::bigint AS transacciones_riesgo_alto,
        COALESCE(AVG(t.score_anomalia), 0)::numeric AS score_promedio
      FROM trida.transacciones t
      JOIN trida.ubicaciones u ON u.id_ubicacion = t.id_ubicacion
      WHERE t.id_usuario = $1
        AND u.latitud IS NOT NULL
        AND u.longitud IS NOT NULL
      `,
      userId,
    );

    const r = rows[0] ?? {
      total_geolocalizadas: 0,
      ciudades_distintas: 0,
      paises_distintos: 0,
      transacciones_riesgo_alto: 0,
      score_promedio: 0,
    };

    return {
      total_geolocalizadas: Number(r.total_geolocalizadas),
      ciudades_distintas: Number(r.ciudades_distintas),
      paises_distintos: Number(r.paises_distintos),
      transacciones_riesgo_alto: Number(r.transacciones_riesgo_alto),
      score_promedio: Math.round(Number(r.score_promedio) * 100) / 100,
    };
  },

  async getLocations(userId: number, filters: MapQueryInput = { limit: 500 }) {
    const safeLimit = Math.max(1, Math.min(filters.limit, 2000));
    const conditions = ["t.id_usuario = $1", "u.latitud IS NOT NULL", "u.longitud IS NOT NULL"];
    const params: unknown[] = [userId];

    if (filters.nivel_riesgo && filters.nivel_riesgo !== "ALL") {
      params.push(filters.nivel_riesgo);
      conditions.push(`CASE
        WHEN t.score_anomalia >= 95 THEN 'CRITICO'
        WHEN t.score_anomalia >= 70 THEN 'ALTO'
        WHEN t.score_anomalia >= 30 THEN 'MEDIO'
        ELSE 'BAJO'
      END = $${params.length}`);
    }

    if (filters.estado && filters.estado !== "ALL") {
      params.push(filters.estado);
      conditions.push(`t.estado = $${params.length}`);
    }

    if (filters.fecha_inicio) {
      params.push(new Date(filters.fecha_inicio));
      conditions.push(`t.fecha_transaccion >= $${params.length}`);
    }

    if (filters.fecha_fin) {
      const fecha_fin = new Date(filters.fecha_fin);
      if (/^\d{4}-\d{2}-\d{2}$/.test(filters.fecha_fin)) {
        fecha_fin.setUTCDate(fecha_fin.getUTCDate() + 1);
        params.push(fecha_fin);
        conditions.push(`t.fecha_transaccion < $${params.length}`);
      } else {
        params.push(fecha_fin);
        conditions.push(`t.fecha_transaccion <= $${params.length}`);
      }
    }

    const whereClause = conditions.join(" AND ");
    const itemsParams = [...params, safeLimit];
    const itemsSql = `
      SELECT
        t.id_transaccion,
        t.monto,
        t.tipo_movimiento,
        t.comercio,
        t.estado,
        t.score_anomalia,
        u.ciudad,
        u.pais,
        u.latitud,
        u.longitud,
        t.fecha_transaccion,
        ct.nombre AS nombre_cuenta,
        cat.nombre AS nombre_categoria
      FROM trida.transacciones t
      JOIN trida.ubicaciones u ON u.id_ubicacion = t.id_ubicacion
      LEFT JOIN trida.cuentas ct ON ct.id_cuenta = t.id_cuenta
      LEFT JOIN trida.categorias cat ON cat.id_categoria = t.id_categoria
      WHERE ${whereClause}
      ORDER BY t.fecha_transaccion DESC
      LIMIT $${itemsParams.length}
    `;

    const countSql = `
      SELECT COUNT(*)::bigint AS total
      FROM trida.transacciones t
      JOIN trida.ubicaciones u ON u.id_ubicacion = t.id_ubicacion
      WHERE ${whereClause}
    `;

    const [itemsRaw, countRows] = await Promise.all([
      queryRaw<RawLocation[]>(itemsSql, ...itemsParams),
      queryRaw<{ total: string | number }[]>(countSql, ...params),
    ]);

    const total = countRows[0]?.total ? Number(countRows[0].total) : 0;
    const items = itemsRaw.map(formatRawLocation);

    return {
      items,
      total,
      truncated: total > items.length,
    };
  },
};
