// ¿Qué? Servicio de insights financieros y de riesgo.
// ¿Para qué? Analizar patrones de gasto, categorías top, alertas y generar consejos accionables por usuario (RS-001).

import { Prisma } from "@prisma/client";
import { queryRaw } from "../../db/queryRaw.js";
import {
  calculateNetBalance,
  calculatePercentage,
} from "../../utils/decimal-money.js";
import { RISK_THRESHOLDS } from "../../utils/risk.js";

export const insightsService = {
  async getInsights(userId: number, periodoDias = 30, accountId?: number) {
    const desde = new Date();
    desde.setDate(desde.getDate() - periodoDias);

    // 1. Resumen de movimientos del periodo
    const resumenRows = await queryRaw<
      {
        ingresos: string | number;
        gastos: string | number;
        ahorros: string | number;
        total_tx: string | number;
        score_promedio: string | number;
      }[]
    >(
      `
      SELECT
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN monto ELSE 0 END), 0)::numeric AS ingresos,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'GASTO' THEN monto ELSE 0 END), 0)::numeric AS gastos,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'AHORRO' THEN monto ELSE 0 END), 0)::numeric AS ahorros,
        COUNT(*)::bigint AS total_tx,
        COALESCE(AVG(score_anomalia), 0)::numeric AS score_promedio
      FROM trida.transacciones
      WHERE id_usuario = $1
        AND fecha_transaccion >= $2
        AND estado IN ('CONFIRMADA', 'APROBADA')
        AND ($3::int IS NULL OR id_cuenta = $3)
      `,
      userId,
      desde,
      accountId ?? null,
    );

    // 2. Top categorías de gasto
    const topCategorias = await queryRaw<
      Array<{
        nombre: string;
        icono: string | null;
        color: string | null;
        total: string | number;
        cantidad: bigint | number;
      }>
    >(
      `
      SELECT
        c.nombre,
        c.icono,
        c.color,
        COALESCE(SUM(t.monto), 0)::numeric AS total,
        COUNT(*)::bigint AS cantidad
      FROM trida.transacciones t
      JOIN trida.categorias c ON c.id_categoria = t.id_categoria
      WHERE t.id_usuario = $1
        AND t.tipo_movimiento = 'GASTO'
        AND t.fecha_transaccion >= $2
        AND t.estado IN ('CONFIRMADA', 'APROBADA')
        AND ($3::int IS NULL OR t.id_cuenta = $3)
      GROUP BY c.id_categoria, c.nombre, c.icono, c.color
      ORDER BY total DESC
      LIMIT 5
      `,
      userId,
      desde,
      accountId ?? null,
    );

    // 3. Top comercios
    const topComercios = await queryRaw<
      Array<{
        comercio: string;
        total: string | number;
        cantidad: bigint | number;
      }>
    >(
      `
      SELECT
        COALESCE(comercio, 'Sin comercio') AS comercio,
        COALESCE(SUM(monto), 0)::numeric AS total,
        COUNT(*)::bigint AS cantidad
      FROM trida.transacciones
      WHERE id_usuario = $1
        AND tipo_movimiento = 'GASTO'
        AND fecha_transaccion >= $2
        AND estado IN ('CONFIRMADA', 'APROBADA')
        AND ($3::int IS NULL OR id_cuenta = $3)
      GROUP BY comercio
      ORDER BY total DESC
      LIMIT 5
      `,
      userId,
      desde,
      accountId ?? null,
    );

    // 4. Alertas del periodo
    const alertasRows = await queryRaw<
      {
        total_alertas: string | number;
        criticas: string | number;
      }[]
    >(
      `
      SELECT
        COUNT(*)::bigint AS total_alertas,
        COUNT(*) FILTER (WHERE a.severidad IN ('ALTA', 'CRITICA'))::bigint AS criticas
      FROM trida.alertas_fraude a
      LEFT JOIN trida.transacciones t ON t.id_transaccion = a.id_transaccion
      WHERE a.id_usuario = $1
        AND a.fecha_detectada >= $2
        AND ($3::int IS NULL OR t.id_cuenta = $3)
      `,
      userId,
      desde,
      accountId ?? null,
    );

    const resumen = resumenRows[0] ?? {
      ingresos: 0,
      gastos: 0,
      ahorros: 0,
      total_tx: 0,
      score_promedio: 0,
    };

    const aportesMeta =
      accountId === undefined
        ? await (async () => {
            const aporteRows = await queryRaw<
              { aportes: string | number }[]
            >(
              `
              SELECT COALESCE(SUM(am.monto), 0)::numeric AS aportes
              FROM trida.aportes_meta am
              JOIN trida.metas_ahorro ma ON ma.id_meta = am.id_meta
              WHERE ma.id_usuario = $1
                AND am.fecha_aporte >= $2
              `,
              userId,
              desde,
            );
            return new Prisma.Decimal(aporteRows[0]?.aportes ?? 0);
          })()
        : new Prisma.Decimal(0);

    const ingresos = new Prisma.Decimal(resumen.ingresos);
    const gastos = new Prisma.Decimal(resumen.gastos);
    const ahorrosMovimiento = new Prisma.Decimal(resumen.ahorros);
    const ahorros = ahorrosMovimiento.plus(aportesMeta);
    const balance = calculateNetBalance(ingresos, gastos, ahorros);
    const tasaAhorro = calculatePercentage(ahorros, ingresos);
    const scorePromedio = Number(resumen.score_promedio);
    const totalAlertas = Number(alertasRows[0]?.total_alertas ?? 0);
    const alertasCriticas = Number(alertasRows[0]?.criticas ?? 0);

    // 5. Consejos generados a partir de los datos
    const consejos: string[] = [];

    if (gastos.greaterThan(ingresos) && ingresos.greaterThan(0)) {
      consejos.push(
        "Tus gastos superan tus ingresos en este periodo. Revisa categorías no esenciales para equilibrar tu balance.",
      );
    }

    if (tasaAhorro.lessThan(10) && ingresos.greaterThan(0)) {
      consejos.push(
        "Tu tasa de ahorro está por debajo del 10%. Considera crear o reforzar una meta de ahorro automática.",
      );
    } else if (tasaAhorro.greaterThanOrEqualTo(20)) {
      consejos.push(
        "Excelente disciplina: estás ahorrando al menos el 20% de tus ingresos en este periodo.",
      );
    }

    if (scorePromedio >= RISK_THRESHOLDS.HIGH) {
      consejos.push(
        "Tu score de riesgo promedio es elevado. Verifica dispositivos desconocidos y transacciones marcadas.",
      );
    }

    if (alertasCriticas > 0) {
      consejos.push(
        `Tienes ${alertasCriticas} alerta(s) de alta criticidad. Revísalas en el Centro de Alertas lo antes posible.`,
      );
    }

    if (topCategorias.length > 0) {
      const top = topCategorias[0];
      consejos.push(
        `Tu mayor gasto está en "${top.nombre}" (${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(Number(top.total))}). Evalúa si puedes optimizar esa categoría.`,
      );
    }

    if (consejos.length === 0) {
      consejos.push(
        "Tu actividad financiera se ve estable en este periodo. Sigue registrando movimientos para mejores recomendaciones.",
      );
    }

    return {
      periodo_dias: periodoDias,
      resumen: {
        ingresos: Number(ingresos),
        gastos: Number(gastos),
        ahorros: Number(ahorros),
        balance: balance.toNumber(),
        tasa_ahorro: tasaAhorro
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toNumber(),
        total_transacciones: Number(resumen.total_tx),
        score_riesgo_promedio: Math.round(scorePromedio * 100) / 100,
        total_alertas: totalAlertas,
        alertas_criticas: alertasCriticas,
      },
      top_categorias: topCategorias.map((c) => ({
        nombre: c.nombre,
        icono: c.icono ?? null,
        color: c.color ?? null,
        total: Number(c.total),
        cantidad: Number(c.cantidad),
      })),
      top_comercios: topComercios.map((c) => ({
        comercio: c.comercio,
        total: Number(c.total),
        cantidad: Number(c.cantidad),
      })),
      consejos,
    };
  },
};
