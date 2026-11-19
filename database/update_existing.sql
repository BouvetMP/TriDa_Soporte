-- Actualiza una base TriDa existente al esquema actual.
-- Hacer un respaldo y ejecutar en una ventana de mantenimiento.
-- No ejecutar sobre una base vacía: para instalaciones nuevas usar schema.sql.
-- Ejemplo: psql -v ON_ERROR_STOP=1 -d TriDa -f database/update_existing.sql

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM trida.usuarios
        WHERE rol NOT IN ('USER', 'ADMIN')
    ) THEN
        RAISE EXCEPTION
            'Hay usuarios con un rol distinto de USER o ADMIN; corrígelos antes de actualizar.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM trida.dispositivos
        GROUP BY id_usuario, identificador_unico
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay identificadores de dispositivo repetidos para un usuario; resuélvelos antes de actualizar.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM trida.categorias
        WHERE id_usuario IS NULL
        GROUP BY LOWER(nombre)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay categorías del sistema con nombres duplicados ignorando mayúsculas; resuélvelos antes de actualizar.';
    END IF;
END;
$$;

ALTER TABLE trida.usuarios
    ADD COLUMN IF NOT EXISTS email_verificado_en TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE trida.usuarios
    ALTER COLUMN email_verificado_en SET DEFAULT NOW(),
    ALTER COLUMN token_version SET DEFAULT 0;

UPDATE trida.usuarios
SET token_version = 0
WHERE token_version IS NULL;

ALTER TABLE trida.usuarios
    ALTER COLUMN token_version SET NOT NULL;

ALTER TABLE trida.usuarios
    DROP CONSTRAINT IF EXISTS chk_usuarios_rol;

ALTER TABLE trida.usuarios
    ADD CONSTRAINT chk_usuarios_rol
    CHECK (rol IN ('USER', 'ADMIN')) NOT VALID;

ALTER TABLE trida.usuarios
    VALIDATE CONSTRAINT chk_usuarios_rol;

INSERT INTO trida.perfil_financiero (id_usuario)
SELECT u.id_usuario
FROM trida.usuarios AS u
WHERE NOT EXISTS (
    SELECT 1
    FROM trida.perfil_financiero AS p
    WHERE p.id_usuario = u.id_usuario
);

ALTER TABLE trida.dispositivos
    DROP CONSTRAINT IF EXISTS dispositivos_identificador_unico_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'trida.dispositivos'::regclass
          AND conname = 'uq_dispositivo_user_identifier'
    ) THEN
        ALTER TABLE trida.dispositivos
            ADD CONSTRAINT uq_dispositivo_user_identifier
            UNIQUE (id_usuario, identificador_unico);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_alertas_tx_fecha
    ON trida.alertas_fraude (id_transaccion, fecha_detectada DESC);
CREATE INDEX IF NOT EXISTS idx_tx_ubicacion
    ON trida.transacciones (id_ubicacion);
CREATE INDEX IF NOT EXISTS idx_tx_dispositivo
    ON trida.transacciones (id_dispositivo);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat_fecha
    ON trida.transacciones (id_usuario, id_categoria, fecha_transaccion);
CREATE INDEX IF NOT EXISTS idx_categories_owner_state
    ON trida.categorias (id_usuario, estado);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_system_name
    ON trida.categorias (LOWER(nombre))
    WHERE id_usuario IS NULL;

CREATE OR REPLACE FUNCTION trida.fn_trg_presupuesto_umbral()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_gastado          NUMERIC(15, 2);
    v_gastado_anterior NUMERIC(15, 2);
    v_limite           NUMERIC(15, 2);
    v_inicio_mes       TIMESTAMPTZ;
    v_nombre_categoria TEXT;
BEGIN
    IF NEW.tipo_movimiento <> 'GASTO'
       OR NEW.estado NOT IN ('CONFIRMADA', 'APROBADA') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.estado IN ('CONFIRMADA', 'APROBADA') THEN
            RETURN NEW;
        END IF;
    END IF;

    v_inicio_mes := DATE_TRUNC('month', NEW.fecha_transaccion);

    SELECT p.limite_mensual
    INTO v_limite
    FROM trida.presupuestos AS p
    WHERE p.id_usuario = NEW.id_usuario
      AND p.id_categoria = NEW.id_categoria
      AND p.mes = EXTRACT(MONTH FROM NEW.fecha_transaccion)::SMALLINT
      AND p.anio = EXTRACT(YEAR FROM NEW.fecha_transaccion)::SMALLINT
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(t.monto), 0)
    INTO v_gastado
    FROM trida.transacciones AS t
    WHERE t.id_usuario = NEW.id_usuario
      AND t.id_categoria = NEW.id_categoria
      AND t.tipo_movimiento = 'GASTO'
      AND t.estado IN ('CONFIRMADA', 'APROBADA')
      AND t.fecha_transaccion >= v_inicio_mes
      AND t.fecha_transaccion < v_inicio_mes + INTERVAL '1 month';

    v_gastado_anterior := v_gastado - NEW.monto;

    SELECT c.nombre
    INTO v_nombre_categoria
    FROM trida.categorias AS c
    WHERE c.id_categoria = NEW.id_categoria;

    IF v_gastado >= v_limite AND v_gastado_anterior < v_limite THEN
        INSERT INTO trida.consejos_financieros
            (id_usuario, tipo, titulo, descripcion, prioridad)
        VALUES (
            NEW.id_usuario,
            'GASTO',
            'Presupuesto excedido',
            FORMAT(
                'Has gastado %s de %s en %s durante este periodo.',
                v_gastado,
                v_limite,
                COALESCE(v_nombre_categoria, 'esta categoría')
            ),
            'ALTA'
        );
    ELSIF v_gastado >= v_limite * 0.8
       AND v_gastado_anterior < v_limite * 0.8 THEN
        INSERT INTO trida.consejos_financieros
            (id_usuario, tipo, titulo, descripcion, prioridad)
        VALUES (
            NEW.id_usuario,
            'GASTO',
            'Presupuesto al 80%',
            FORMAT(
                'Has gastado %s de %s en %s durante este periodo.',
                v_gastado,
                v_limite,
                COALESCE(v_nombre_categoria, 'esta categoría')
            ),
            'MEDIA'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presupuesto_umbral ON trida.transacciones;
CREATE TRIGGER trg_presupuesto_umbral
AFTER INSERT OR UPDATE OF estado ON trida.transacciones
FOR EACH ROW
EXECUTE FUNCTION trida.fn_trg_presupuesto_umbral();

CREATE OR REPLACE FUNCTION trida.fn_presupuestos(
    p_id_usuario INTEGER,
    p_mes        INTEGER DEFAULT NULL,
    p_anio       INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id_presupuesto INTEGER,
    id_categoria INTEGER,
    categoria VARCHAR(80),
    limite_mensual NUMERIC(15, 2),
    mes SMALLINT,
    anio SMALLINT,
    gastado NUMERIC(15, 2),
    porcentaje NUMERIC(5, 2)
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
    SELECT
        p.id_presupuesto,
        p.id_categoria,
        c.nombre,
        p.limite_mensual,
        p.mes,
        p.anio,
        COALESCE(SUM(t.monto), 0)::NUMERIC(15, 2) AS gastado,
        ROUND(COALESCE(SUM(t.monto), 0) / NULLIF(p.limite_mensual, 0) * 100, 2) AS porcentaje
    FROM trida.presupuestos AS p
    LEFT JOIN trida.categorias AS c ON c.id_categoria = p.id_categoria
    LEFT JOIN trida.transacciones AS t
      ON t.id_usuario = p.id_usuario
     AND t.id_categoria = p.id_categoria
     AND t.tipo_movimiento = 'GASTO'
     AND t.estado IN ('CONFIRMADA', 'APROBADA')
     AND EXTRACT(MONTH FROM t.fecha_transaccion) = p.mes
     AND EXTRACT(YEAR FROM t.fecha_transaccion) = p.anio
    WHERE p.id_usuario = p_id_usuario
      AND (p_mes IS NULL OR p.mes = p_mes)
      AND (p_anio IS NULL OR p.anio = p_anio)
    GROUP BY p.id_presupuesto, p.id_categoria, c.nombre,
             p.limite_mensual, p.mes, p.anio
    ORDER BY p.mes DESC, c.nombre;
$$;

DROP TRIGGER IF EXISTS trg_alerta_feedback ON trida.alertas_fraude;
DROP FUNCTION IF EXISTS trida.fn_trg_alerta_feedback();
DROP TRIGGER IF EXISTS trg_meta_completada ON trida.metas_ahorro;
DROP FUNCTION IF EXISTS trida.fn_trg_meta_completada();

COMMIT;
