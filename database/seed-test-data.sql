-- Carga manual y atomica de datos demo para un usuario existente.
-- Reemplaza el nombre de la base y el correo de ejemplo antes de ejecutar.
BEGIN;

DO $seed$
DECLARE
    v_expected_database TEXT := 'REEMPLAZA_CON_EL_NOMBRE_EXACTO_DE_LA_BASE_TEST';
    v_email TEXT := 'REEMPLAZA_CON_CORREO_DE_PRUEBA';
    v_user_id INTEGER;
    v_account_bank INTEGER;
    v_account_card INTEGER;
    v_account_cash INTEGER;
    v_category_food INTEGER;
    v_category_transport INTEGER;
    v_category_home INTEGER;
    v_category_income INTEGER;
    v_category_savings INTEGER;
    v_device_id INTEGER;
    v_location_id INTEGER;
    v_transaction_id INTEGER;
    v_goal_active INTEGER;
    v_goal_completed INTEGER;
    v_goal_paused INTEGER;
    v_seed_key TEXT;
    v_today DATE;
    v_month SMALLINT;
    v_year SMALLINT;
    v_index INTEGER := 0;
    v_alert_index INTEGER := 0;
    v_account_index INTEGER;
    v_category_index INTEGER;
    v_destination_index INTEGER;
    v_days_ago INTEGER;
    v_effective_days INTEGER;
    v_amount NUMERIC(15, 2);
    v_delta NUMERIC(15, 2);
    v_score NUMERIC(5, 2);
    v_status TEXT;
    v_severity TEXT;
    v_alert_state TEXT;
    v_action TEXT;
    v_reason TEXT;
    v_city TEXT;
    v_country TEXT;
    v_latitude NUMERIC(9, 6);
    v_longitude NUMERIC(9, 6);
    v_merchant TEXT;
    v_description TEXT;
    v_tx_date TIMESTAMPTZ;
    v_event_id TEXT;
    v_account_id INTEGER;
    v_category_id INTEGER;
    v_destination_id INTEGER;
    v_source TEXT;
    v_channel TEXT;
    v_recurring BOOLEAN;
    r RECORD;
    v_severities TEXT[] := ARRAY['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
    v_alert_states TEXT[] := ARRAY['PENDIENTE', 'CONFIRMADA', 'DESCARTADA'];
BEGIN
    IF v_expected_database = 'REEMPLAZA_CON_EL_NOMBRE_EXACTO_DE_LA_BASE_TEST'
        OR current_database() <> v_expected_database
        OR v_expected_database !~* '(test|testing|prueba|pruebas|(^|[-_])ci($|[-_]))' THEN
        RAISE EXCEPTION 'Carga cancelada: confirma el nombre exacto de la base de pruebas antes de ejecutar.';
    END IF;

    IF v_email = 'REEMPLAZA_CON_CORREO_DE_PRUEBA' THEN
        RAISE EXCEPTION 'Carga cancelada: reemplaza el correo de ejemplo en este archivo.';
    END IF;

    SELECT id_usuario
    INTO v_user_id
    FROM trida.usuarios
    WHERE lower(email) = lower(v_email)
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Carga cancelada: no se encontro el usuario en esta base de pruebas.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM trida.cuentas
        WHERE id_usuario = v_user_id AND nombre LIKE 'TriDa Demo - %'
    ) OR EXISTS (
        SELECT 1 FROM trida.categorias
        WHERE id_usuario = v_user_id AND nombre LIKE 'Demo - %'
    ) THEN
        RAISE EXCEPTION 'Carga cancelada: ya existen cuentas o categorias demo para este usuario.';
    END IF;

    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE;
    v_month := EXTRACT(MONTH FROM v_today)::SMALLINT;
    v_year := EXTRACT(YEAR FROM v_today)::SMALLINT;
    v_seed_key := 'trida-demo-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')
        || '-' || pg_backend_pid();

    INSERT INTO trida.cuentas
        (id_usuario, nombre, entidad, tipo, numero_enmascarado, color, saldo_inicial, saldo_actual)
    VALUES
        (v_user_id, 'TriDa Demo - Cuenta bancaria', 'Banco de demostracion', 'BANCO',
         '4821', '#7C3AED', 5000000, 5000000)
    RETURNING id_cuenta INTO v_account_bank;

    INSERT INTO trida.cuentas
        (id_usuario, nombre, entidad, tipo, numero_enmascarado, color, saldo_inicial, saldo_actual)
    VALUES
        (v_user_id, 'TriDa Demo - Tarjeta', 'Tarjeta de demostracion', 'TARJETA',
         '1937', '#4F46E5', 1500000, 1500000)
    RETURNING id_cuenta INTO v_account_card;

    INSERT INTO trida.cuentas
        (id_usuario, nombre, tipo, color, saldo_inicial, saldo_actual)
    VALUES
        (v_user_id, 'TriDa Demo - Efectivo', 'EFECTIVO', '#0F766E', 1500000, 1500000)
    RETURNING id_cuenta INTO v_account_cash;

    INSERT INTO trida.categorias (id_usuario, nombre, tipo, color, es_default)
    VALUES (v_user_id, 'Demo - Alimentacion', 'GASTO', '#F97316', FALSE)
    RETURNING id_categoria INTO v_category_food;

    INSERT INTO trida.categorias (id_usuario, nombre, tipo, color, es_default)
    VALUES (v_user_id, 'Demo - Transporte', 'GASTO', '#0EA5E9', FALSE)
    RETURNING id_categoria INTO v_category_transport;

    INSERT INTO trida.categorias (id_usuario, nombre, tipo, color, es_default)
    VALUES (v_user_id, 'Demo - Vivienda', 'GASTO', '#A855F7', FALSE)
    RETURNING id_categoria INTO v_category_home;

    INSERT INTO trida.categorias (id_usuario, nombre, tipo, color, es_default)
    VALUES (v_user_id, 'Demo - Ingresos', 'INGRESO', '#22C55E', FALSE)
    RETURNING id_categoria INTO v_category_income;

    INSERT INTO trida.categorias (id_usuario, nombre, tipo, color, es_default)
    VALUES (v_user_id, 'Demo - Ahorro', 'AHORRO', '#14B8A6', FALSE)
    RETURNING id_categoria INTO v_category_savings;

    INSERT INTO trida.dispositivos
        (id_usuario, tipo_dispositivo, identificador_unico, sistema_operativo, navegador, confiable)
    VALUES
        (v_user_id, 'NAVEGADOR', v_seed_key, 'Dispositivo de prueba', 'Navegador de prueba', TRUE)
    RETURNING id_dispositivo INTO v_device_id;

    INSERT INTO trida.presupuestos (id_usuario, id_categoria, limite_mensual, mes, anio)
    VALUES
        (v_user_id, v_category_food, 400000, v_month, v_year),
        (v_user_id, v_category_transport, 250000, v_month, v_year),
        (v_user_id, v_category_home, 800000, v_month, v_year);

    INSERT INTO trida.metas_ahorro
        (id_usuario, id_categoria, nombre, descripcion, monto_objetivo, monto_actual, fecha_limite, estado)
    VALUES
        (v_user_id, v_category_savings, 'Demo - Fondo de emergencia',
         'Meta activa para validar el avance y las aportaciones.', 1500000, 0, v_today + 60, 'ACTIVA')
    RETURNING id_meta INTO v_goal_active;

    INSERT INTO trida.aportes_meta (id_meta, monto, fecha_aporte)
    VALUES
        (v_goal_active, 120000, CURRENT_TIMESTAMP - INTERVAL '3 days'),
        (v_goal_active, 100000, CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (v_goal_active, 130000, CURRENT_TIMESTAMP - INTERVAL '1 day');

    INSERT INTO trida.metas_ahorro
        (id_usuario, id_categoria, nombre, descripcion, monto_objetivo, monto_actual, fecha_limite, estado)
    VALUES
        (v_user_id, v_category_savings, 'Demo - Viaje',
         'Meta completada para validar el aviso de logro.', 500000, 0, v_today + 14, 'ACTIVA')
    RETURNING id_meta INTO v_goal_completed;

    INSERT INTO trida.aportes_meta (id_meta, monto)
    VALUES (v_goal_completed, 200000), (v_goal_completed, 300000);

    UPDATE trida.metas_ahorro
    SET estado = 'COMPLETADA', fecha_completada = CURRENT_TIMESTAMP
    WHERE id_meta = v_goal_completed;

    INSERT INTO trida.metas_ahorro
        (id_usuario, id_categoria, nombre, descripcion, monto_objetivo, monto_actual, fecha_limite, estado)
    VALUES
        (v_user_id, v_category_savings, 'Demo - Equipo',
         'Meta pausada para mostrar distintos estados.', 3000000, 0, v_today + 120, 'ACTIVA')
    RETURNING id_meta INTO v_goal_paused;

    INSERT INTO trida.aportes_meta (id_meta, monto)
    VALUES (v_goal_paused, 400000), (v_goal_paused, 250000);

    UPDATE trida.metas_ahorro
    SET estado = 'PAUSADA'
    WHERE id_meta = v_goal_paused;

    FOR r IN
        SELECT *
        FROM (VALUES
            (1, 4, 'INGRESO', 3800000::NUMERIC, 'CONFIRMADA', 3, 'Bogota', 'Colombia', 4.711::NUMERIC, -74.0721::NUMERIC, 'Nomina Demo', 'Ingreso mensual de demostracion.', 4::NUMERIC, FALSE, NULL::INTEGER),
            (3, 1, 'GASTO', 125000::NUMERIC, 'CONFIRMADA', 1, 'Bogota', 'Colombia', 4.711::NUMERIC, -74.0721::NUMERIC, 'Mercado Demo', 'Compra de alimentos de demostracion.', 8::NUMERIC, FALSE, NULL::INTEGER),
            (2, 2, 'GASTO', 45000::NUMERIC, 'APROBADA', 2, 'Medellin', 'Colombia', 6.2476::NUMERIC, -75.5658::NUMERIC, 'Transporte Demo', 'Pago aprobado de transporte.', 12::NUMERIC, FALSE, NULL::INTEGER),
            (1, 3, 'GASTO', 220000::NUMERIC, 'CONFIRMADA', 7, 'Bogota', 'Colombia', 4.711::NUMERIC, -74.0721::NUMERIC, 'Servicios Demo', 'Pago de servicios del hogar.', 10::NUMERIC, FALSE, NULL::INTEGER),
            (3, 5, 'AHORRO', 80000::NUMERIC, 'CONFIRMADA', 5, 'Cali', 'Colombia', 3.4516::NUMERIC, -76.532::NUMERIC, NULL::TEXT, 'Aporte de ahorro de demostracion.', 5::NUMERIC, FALSE, NULL::INTEGER),
            (1, NULL::INTEGER, 'TRANSFERENCIA', 300000::NUMERIC, 'CONFIRMADA', 4, 'Bogota', 'Colombia', 4.711::NUMERIC, -74.0721::NUMERIC, NULL::TEXT, 'Transferencia entre cuentas demo.', 6::NUMERIC, FALSE, 3),
            (3, 1, 'GASTO', 55000::NUMERIC, 'PENDIENTE', 6, 'Pereira', 'Colombia', 4.8087::NUMERIC, -75.6906::NUMERIC, 'Cafe Demo', 'Movimiento pendiente de revision.', 52::NUMERIC, FALSE, NULL::INTEGER),
            (3, 2, 'GASTO', 90000::NUMERIC, 'SOSPECHOSA', 10, 'Quito', 'Ecuador', -0.1807::NUMERIC, -78.4678::NUMERIC, 'Comercio Exterior Demo', 'Movimiento sospechoso fuera del pais.', 78::NUMERIC, FALSE, NULL::INTEGER),
            (2, 1, 'GASTO', 155000::NUMERIC, 'RECHAZADA', 8, 'Cartagena', 'Colombia', 10.391::NUMERIC, -75.4794::NUMERIC, 'Comercio Rechazado Demo', 'Movimiento rechazado de demostracion.', 88::NUMERIC, FALSE, NULL::INTEGER),
            (1, 4, 'INGRESO', 650000::NUMERIC, 'PENDIENTE', 2, 'Bucaramanga', 'Colombia', 7.1193::NUMERIC, -73.1227::NUMERIC, 'Ingreso Pendiente Demo', 'Ingreso pendiente de confirmacion.', 24::NUMERIC, TRUE, NULL::INTEGER)
        ) AS demo(account_index, category_index, movement, amount, status, days_ago, city, country, latitude, longitude, merchant, description, score, recurring, destination_index)
    LOOP
        v_index := v_index + 1;
        v_effective_days := LEAST(r.days_ago, GREATEST(EXTRACT(DAY FROM v_today)::INTEGER - 1, 0));
        v_tx_date := CURRENT_TIMESTAMP - make_interval(days => v_effective_days);
        v_account_id := CASE r.account_index
            WHEN 1 THEN v_account_bank
            WHEN 2 THEN v_account_card
            ELSE v_account_cash
        END;
        v_category_id := CASE r.category_index
            WHEN 1 THEN v_category_food
            WHEN 2 THEN v_category_transport
            WHEN 3 THEN v_category_home
            WHEN 4 THEN v_category_income
            WHEN 5 THEN v_category_savings
            ELSE NULL
        END;
        v_destination_id := CASE r.destination_index
            WHEN 1 THEN v_account_bank
            WHEN 2 THEN v_account_card
            WHEN 3 THEN v_account_cash
            ELSE NULL
        END;
        v_channel := CASE WHEN r.account_index = 3 THEN 'efectivo' ELSE 'webhook' END;
        v_source := CASE WHEN r.account_index = 3 THEN NULL ELSE 'DEMO' END;

        INSERT INTO trida.ubicaciones (id_dispositivo, pais, ciudad, latitud, longitud)
        VALUES (v_device_id, r.country, r.city, r.latitude, r.longitude)
        RETURNING id_ubicacion INTO v_location_id;

        v_event_id := CASE WHEN v_source IS NULL THEN NULL
            ELSE v_seed_key || '-regular-' || v_index END;

        INSERT INTO trida.transacciones
            (id_usuario, id_cuenta, id_cuenta_destino, id_categoria, id_dispositivo, id_ubicacion,
             tipo_movimiento, monto, moneda, descripcion, comercio, canal, fuente_externa,
             id_evento_externo, es_recurrente, score_anomalia, estado, fecha_transaccion)
        VALUES
            (v_user_id, v_account_id, v_destination_id, v_category_id, v_device_id, v_location_id,
             r.movement, r.amount, 'COP', r.description, r.merchant, v_channel, v_source,
             v_event_id, r.recurring, r.score, r.status, v_tx_date);

        IF r.status = 'CONFIRMADA' THEN
            v_delta := CASE WHEN r.movement = 'INGRESO' THEN r.amount ELSE -r.amount END;
            UPDATE trida.cuentas
            SET saldo_actual = saldo_actual + v_delta
            WHERE id_cuenta = v_account_id;

            IF v_destination_id IS NOT NULL THEN
                UPDATE trida.cuentas
                SET saldo_actual = saldo_actual + r.amount
                WHERE id_cuenta = v_destination_id;
            END IF;
        END IF;
    END LOOP;

    FOREACH v_severity IN ARRAY v_severities LOOP
        FOREACH v_alert_state IN ARRAY v_alert_states LOOP
            v_alert_index := v_alert_index + 1;
            v_account_index := ((v_alert_index - 1) % 3) + 1;
            v_category_index := ((v_alert_index - 1) % 3) + 1;
            v_amount := 45000 + v_alert_index * 17500;
            v_days_ago := v_alert_index;
            v_effective_days := LEAST(v_days_ago, GREATEST(EXTRACT(DAY FROM v_today)::INTEGER - 1, 0));
            v_tx_date := CURRENT_TIMESTAMP - make_interval(days => v_effective_days);
            v_status := CASE v_alert_state
                WHEN 'PENDIENTE' THEN 'PENDIENTE'
                WHEN 'CONFIRMADA' THEN 'RECHAZADA'
                ELSE 'CONFIRMADA'
            END;
            v_action := CASE
                WHEN v_alert_state = 'PENDIENTE' THEN NULL
                WHEN v_alert_state = 'DESCARTADA' THEN 'FUI_YO'
                WHEN v_severity = 'CRITICA' THEN 'BLOQUEAR_TARJETA'
                ELSE 'NO_FUI_YO'
            END;
            v_score := CASE v_severity
                WHEN 'BAJA' THEN 18
                WHEN 'MEDIA' THEN 42
                WHEN 'ALTA' THEN 68
                ELSE 92
            END;
            v_reason := CASE v_alert_index % 4
                WHEN 1 THEN 'Compra en un comercio poco frecuente.'
                WHEN 2 THEN 'Monto superior al promedio habitual.'
                WHEN 3 THEN 'Ubicacion distinta a las ultimas compras.'
                ELSE 'Actividad inusual desde un dispositivo nuevo.'
            END;
            v_city := CASE v_alert_index % 6
                WHEN 0 THEN 'Bogota'
                WHEN 1 THEN 'Medellin'
                WHEN 2 THEN 'Cali'
                WHEN 3 THEN 'Barranquilla'
                WHEN 4 THEN 'Cartagena'
                ELSE 'Quito'
            END;
            v_country := CASE WHEN v_city = 'Quito' THEN 'Ecuador' ELSE 'Colombia' END;
            v_latitude := CASE v_city
                WHEN 'Bogota' THEN 4.711
                WHEN 'Medellin' THEN 6.2476
                WHEN 'Cali' THEN 3.4516
                WHEN 'Barranquilla' THEN 10.9685
                WHEN 'Cartagena' THEN 10.391
                ELSE -0.1807
            END;
            v_longitude := CASE v_city
                WHEN 'Bogota' THEN -74.0721
                WHEN 'Medellin' THEN -75.5658
                WHEN 'Cali' THEN -76.532
                WHEN 'Barranquilla' THEN -74.7813
                WHEN 'Cartagena' THEN -75.4794
                ELSE -78.4678
            END;
            v_merchant := CASE
                WHEN v_alert_index % 5 = 0 THEN NULL
                ELSE 'Comercio Demo ' || v_alert_index
            END;
            v_description := 'Movimiento de prueba para alerta ' || lower(v_severity) || '.';
            v_account_id := CASE v_account_index
                WHEN 1 THEN v_account_bank
                WHEN 2 THEN v_account_card
                ELSE v_account_cash
            END;
            v_category_id := CASE v_category_index
                WHEN 1 THEN v_category_food
                WHEN 2 THEN v_category_transport
                ELSE v_category_home
            END;
            v_channel := CASE WHEN v_account_index = 3 THEN 'efectivo' ELSE 'webhook' END;
            v_source := CASE WHEN v_account_index = 3 THEN NULL ELSE 'DEMO' END;

            INSERT INTO trida.ubicaciones (id_dispositivo, pais, ciudad, latitud, longitud)
            VALUES (v_device_id, v_country, v_city, v_latitude, v_longitude)
            RETURNING id_ubicacion INTO v_location_id;

            v_event_id := CASE WHEN v_source IS NULL THEN NULL
                ELSE v_seed_key || '-alert-' || v_alert_index END;

            INSERT INTO trida.transacciones
                (id_usuario, id_cuenta, id_categoria, id_dispositivo, id_ubicacion,
                 tipo_movimiento, monto, moneda, descripcion, comercio, canal, fuente_externa,
                 id_evento_externo, es_recurrente, score_anomalia, estado, fecha_transaccion)
            VALUES
                (v_user_id, v_account_id, v_category_id, v_device_id, v_location_id,
                 'GASTO', v_amount, 'COP', v_description, v_merchant, v_channel, v_source,
                 v_event_id, FALSE, v_score, v_status, v_tx_date)
            RETURNING id_transaccion INTO v_transaction_id;

            IF v_status = 'CONFIRMADA' THEN
                UPDATE trida.cuentas
                SET saldo_actual = saldo_actual - v_amount
                WHERE id_cuenta = v_account_id;
            END IF;

            INSERT INTO trida.alertas_fraude
                (id_usuario, id_transaccion, severidad, motivo, estado,
                 fecha_detectada, fecha_resuelta, accion_usuario)
            VALUES
                (v_user_id, v_transaction_id, v_severity, v_reason, v_alert_state,
                 v_tx_date, CASE WHEN v_alert_state = 'PENDIENTE'
                    THEN NULL ELSE v_tx_date + INTERVAL '1 hour' END, v_action);
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Datos demo creados: 3 cuentas, 5 categorias, 22 movimientos, 12 alertas, 3 presupuestos y 3 metas.';
END;
$seed$;

COMMIT;
