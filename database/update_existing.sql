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

DROP TRIGGER IF EXISTS trg_alerta_feedback ON trida.alertas_fraude;
DROP FUNCTION IF EXISTS trida.fn_trg_alerta_feedback();
DROP TRIGGER IF EXISTS trg_meta_completada ON trida.metas_ahorro;
DROP FUNCTION IF EXISTS trida.fn_trg_meta_completada();

COMMIT;
