// ¿Qué? Servicio del dashboard de finanzas personales y monitoreo de riesgo.
// ¿Para qué? Agregar saldos totales, resumen mensual de ingresos/gastos, alertas activas y transacciones recientes por usuario (RS-001).

import { queryRaw } from "../../db/queryRaw.js";

export const dashboardService = {
  async getStats(userId: number) {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    // 1. Saldo Total acumulado de las cuentas del usuario
    const saldoRows = await queryRaw<{ saldo_total: string | number }[]>(
      `
      SELECT COALESCE(SUM(saldo_inicial), 0)::numeric AS saldo_total
      FROM trida.cuentas
      WHERE id_usuario = $1 AND estado = true
      `,
      userId,
    );

    // 2. Resumen del mes actual (Ingresos, Gastos, Ahorros)
    const resumenMesRows = await queryRaw<
      {
        ingresos: string | number;
        gastos: string | number;
        ahorros: string | number;
      }[]
    >(
      `
      SELECT
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN monto ELSE 0 END), 0)::numeric AS ingresos,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'GASTO' THEN monto ELSE 0 END), 0)::numeric AS gastos,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'AHORRO' THEN monto ELSE 0 END), 0)::numeric AS ahorros
      FROM trida.transacciones
      WHERE id_usuario = $1
        AND fecha_transaccion >= $2
        AND estado IN ('CONFIRMADA', 'APROBADA')
      `,
      userId,
      inicioMes,
    );

    // 3. Conteo de Alertas de Riesgo/Fraude Activas y Críticas
    const alertasRows = await queryRaw<
      {
        alertas_activas: string | number;
        alertas_criticas: string | number;
      }[]
    >(
      `
      SELECT
        COUNT(*) FILTER (WHERE a.estado = 'PENDIENTE')::bigint AS alertas_activas,
        COUNT(*) FILTER (
          WHERE a.estado = 'PENDIENTE' AND a.severidad IN ('ALTA', 'CRITICA')
        )::bigint AS alertas_criticas
      FROM trida.alertas_fraude a
      WHERE a.id_usuario = $1
      `,
      userId,
    );

    const saldoTotal = Number(saldoRows[0]?.saldo_total ?? 0);
    const rMes = resumenMesRows[0] ?? { ingresos: 0, gastos: 0, ahorros: 0 };
    const rAlertas = alertasRows[0] ?? {
      alertas_activas: 0,
      alertas_criticas: 0,
    };

    const ingresos = Number(rMes.ingresos);
    const gastos = Number(rMes.gastos);

    return {
      saldo_total: saldoTotal,
      mes_actual: {
        ingresos,
        gastos,
        ahorros: Number(rMes.ahorros),
        balance_neto: ingresos - gastos,
      },
      alertas: {
        activas: Number(rAlertas.alertas_activas),
        criticas: Number(rAlertas.alertas_criticas),
      },
    };
  },

  async getRecentAlerts(userId: number, limit = 5) {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const rows = await queryRaw<
      Array<{
        id_alerta: number;
        id_transaccion: number;
        severidad: string;
        fecha_detectada: Date;
        motivo: string;
        accion_usuario: string | null;
        estado: string;
        monto: string | number;
        comercio: string | null;
        estado_transaccion: string;
      }>
    >(
      `
      SELECT
        a.id_alerta,
        a.id_transaccion,
        a.severidad,
        a.fecha_detectada,
        a.motivo,
        a.accion_usuario,
        a.estado,
        t.monto,
        t.comercio,
        t.estado AS estado_transaccion
      FROM trida.alertas_fraude a
      JOIN trida.transacciones t ON t.id_transaccion = a.id_transaccion
      WHERE a.id_usuario = $1
      ORDER BY a.fecha_detectada DESC
      LIMIT $2
      `,
      userId,
      safeLimit,
    );

    return rows.map((r) => ({
      id_alerta: Number(r.id_alerta),
      id_transaccion: Number(r.id_transaccion),
      severidad: r.severidad,
      fecha_detectada: r.fecha_detectada,
      motivo: r.motivo,
      accion_usuario: r.accion_usuario ?? null,
      estado: r.estado,
      monto: Number(r.monto),
      comercio: r.comercio ?? null,
      estado_transaccion: r.estado_transaccion,
    }));
  },

  async getRecentTransactions(userId: number, limit = 5) {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const rows = await queryRaw<
      Array<{
        id_transaccion: number;
        monto: string | number;
        tipo_movimiento: string;
        fecha_transaccion: Date;
        comercio: string | null;
        estado: string;
        score_anomalia: string | number | null;
        nombre_categoria: string | null;
        categoria_icono: string | null;
        categoria_color: string | null;
      }>
    >(
      `
      SELECT
        t.id_transaccion,
        t.monto,
        t.tipo_movimiento,
        t.fecha_transaccion,
        t.comercio,
        t.estado,
        t.score_anomalia,
        cat.nombre AS nombre_categoria,
        cat.icono AS categoria_icono,
        cat.color AS categoria_color
      FROM trida.transacciones t
      LEFT JOIN trida.categorias cat ON cat.id_categoria = t.id_categoria
      WHERE t.id_usuario = $1
      ORDER BY t.fecha_transaccion DESC
      LIMIT $2
      `,
      userId,
      safeLimit,
    );

    return rows.map((r) => ({
      id_transaccion: Number(r.id_transaccion),
      monto: Number(r.monto),
      tipo_movimiento: r.tipo_movimiento,
      fecha_transaccion: r.fecha_transaccion,
      comercio: r.comercio ?? null,
      estado: r.estado,
      score_anomalia: r.score_anomalia !== null ? Number(r.score_anomalia) : 0,
      categoria: {
        nombre: r.nombre_categoria ?? "Sin categoría",
        icono: r.categoria_icono ?? null,
        color: r.categoria_color ?? null,
      },
    }));
  },
};
