// ¿Qué? Especificación OpenAPI 3 de TriDa Backend v2.
// ¿Para qué? Documentar y probar todos los endpoints en /api/docs.

import swaggerJsdoc from "swagger-jsdoc";

const errorContentByStatus = {
  "400": {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
      examples: {
        validation: { $ref: "#/components/examples/ValidationError" },
        relation: { $ref: "#/components/examples/InvalidRelationError" },
        databaseRecord: { $ref: "#/components/examples/DatabaseRecordError" },
      },
    },
  },
  "401": {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
      examples: { unauthorized: { $ref: "#/components/examples/UnauthorizedError" } },
    },
  },
  "403": {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
      examples: { forbidden: { $ref: "#/components/examples/ForbiddenError" } },
    },
  },
  "404": {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
      examples: { notFound: { $ref: "#/components/examples/NotFoundError" } },
    },
  },
  "409": {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
      examples: { conflict: { $ref: "#/components/examples/ConflictError" } },
    },
  },
  "429": {
    "application/json": {
      schema: { $ref: "#/components/schemas/RateLimitErrorResponse" },
      examples: { rateLimit: { $ref: "#/components/examples/RateLimitError" } },
    },
  },
  "500": {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
      examples: { internal: { $ref: "#/components/examples/InternalServerError" } },
    },
  },
};

const errorResponses = {
  BadRequestError: {
    description:
      "Solicitud inválida, validación fallida o referencia inexistente (incluye Prisma P2003).",
    content: errorContentByStatus["400"],
  },
  UnauthorizedError: {
    description: "Falta el token, no es válido o las credenciales no son correctas.",
    content: errorContentByStatus["401"],
  },
  ForbiddenError: {
    description: "El usuario no tiene permiso o su cuenta está desactivada.",
    content: errorContentByStatus["403"],
  },
  NotFoundError: {
    description: "No existe el recurso solicitado o no pertenece al usuario autenticado.",
    content: errorContentByStatus["404"],
  },
  ConflictError: {
    description:
      "La operación entra en conflicto con el estado/datos existentes (incluye Prisma P2002).",
    content: errorContentByStatus["409"],
  },
  TooManyRequestsError: {
    description: "Se excedió el límite de peticiones por ventana de tiempo.",
    content: errorContentByStatus["429"],
  },
  InternalServerError: {
    description: "Error interno no esperado. El detalle técnico se registra en el servidor.",
    content: errorContentByStatus["500"],
  },
};

const errorResponseComponentByStatus: Record<string, string> = {
  "400": "BadRequestError",
  "401": "UnauthorizedError",
  "403": "ForbiddenError",
  "404": "NotFoundError",
  "409": "ConflictError",
  "429": "TooManyRequestsError",
  "500": "InternalServerError",
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TriDa API v2",
      version: "2.0.0",
      description:
        "API de finanzas personales con prevención de fraude.\n\n" +
        "**Flujo recomendado:**\n" +
        "1. `POST /api/v2/auth/register` o `POST /api/v2/auth/login`\n" +
        "2. Copiar el token JWT\n" +
        "3. Pulsar **Authorize** e ingresar el token\n" +
        "4. Probar el resto de endpoints protegidos",
    },
    servers: [
      {
        url: "/",
        description: "Origen actual de la API",
      },
    ],
    tags: [
      { name: "Health", description: "Estado del servicio" },
      { name: "Auth", description: "Registro, login y contraseñas" },
      { name: "Accounts", description: "Cuentas financieras" },
      { name: "Categories", description: "Categorías INGRESO/GASTO/AHORRO" },
      { name: "Transactions", description: "Movimientos y riesgo" },
      { name: "Devices", description: "Dispositivos del usuario" },
      { name: "Alerts", description: "Alertas de fraude" },
      { name: "Dashboard", description: "Resumen financiero" },
      { name: "Budgets", description: "Presupuestos por categoría" },
      { name: "Savings", description: "Metas de ahorro" },
      { name: "Profile", description: "Perfil y patrón de comportamiento" },
      { name: "Insights", description: "Consejos y analítica" },
      { name: "Reports", description: "Reportes financieros" },
      { name: "Map", description: "Mapa de transacciones" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          required: ["success", "error"],
          properties: {
            success: { type: "boolean", enum: [false] },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Error de validación de datos" },
                details: {
                  nullable: true,
                  oneOf: [
                    {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          field: { type: "string" },
                          message: { type: "string" },
                        },
                      },
                    },
                    { type: "object", additionalProperties: true },
                    { type: "string" },
                  ],
                },
              },
            },
          },
        },
        RateLimitErrorResponse: {
          allOf: [{ $ref: "#/components/schemas/ErrorResponse" }],
        },
        SuccessResponse: {
          type: "object",
          required: ["success", "data"],
          properties: {
            success: { type: "boolean", enum: [true] },
            message: { type: "string" },
            data: {},
          },
        },
        VerifyResetTokenRequest: {
          type: "object",
          required: ["token"],
          properties: { token: { type: "string" } },
        },
        VerifyEmailRequest: {
          type: "object",
          required: ["token"],
          properties: { token: { type: "string" } },
        },
        RegisterRequest: {
          type: "object",
          required: ["nombre_completo", "email", "password"],
          properties: {
            nombre_completo: { type: "string", example: "Ana Pérez" },
            email: { type: "string", format: "email", example: "ana@email.com" },
            password: {
              type: "string",
              minLength: 10,
              example: "ClaveSegura1",
              description: "Mín. 10 caracteres, mayúscula, minúscula y número",
            },
            telefono: {
              type: "string",
              nullable: true,
              example: "+584121234567",
              description: "Enviar null para eliminar el teléfono guardado.",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "ana@email.com" },
            password: { type: "string", example: "ClaveSegura1" },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["token", "password_nueva"],
          properties: {
            token: { type: "string" },
            password_nueva: {
              type: "string",
              minLength: 10,
              description: "Mín. 10 caracteres, mayúscula, minúscula y número",
            },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["password_actual", "password_nueva"],
          properties: {
            password_actual: { type: "string" },
            password_nueva: { type: "string", minLength: 10 },
          },
        },
        CreateAccountRequest: {
          type: "object",
          required: ["nombre", "tipo"],
          properties: {
            nombre: { type: "string", example: "Banco Principal" },
            tipo: {
              type: "string",
              enum: ["BANCO", "TARJETA", "BILLETERA", "EFECTIVO"],
            },
            entidad: { type: "string", example: "Banesco" },
            numero_enmascarado: { type: "string", example: "****1234" },
            color: { type: "string", maxLength: 20, example: "#6366F1" },
            saldo_inicial: { type: "number", example: 1000 },
            estado: { type: "boolean", default: true },
          },
        },
        CreateCategoryRequest: {
          type: "object",
          required: ["nombre", "tipo"],
          properties: {
            nombre: { type: "string", example: "Comida" },
            tipo: { type: "string", enum: ["INGRESO", "GASTO", "AHORRO"] },
            icono: { type: "string", example: "utensils" },
            color: { type: "string", example: "#ef4444" },
          },
        },
        CreateTransactionRequest: {
          type: "object",
          required: ["id_cuenta", "monto", "tipo_movimiento"],
          properties: {
            id_cuenta: { type: "integer", example: 1 },
            id_categoria: {
              type: "integer",
              description:
                "Opcional; usar un ID devuelto por GET /api/v2/categories que sea propio o del sistema.",
            },
            id_dispositivo: {
              type: "integer",
              description:
                "Opcional; incluir solo un dispositivo registrado por este usuario. Omitir si no aplica.",
            },
            monto: { type: "number", example: 50.75 },
            tipo_movimiento: {
              type: "string",
              enum: ["INGRESO", "GASTO", "AHORRO"],
            },
            comercio: { type: "string", example: "Farmatodo" },
            descripcion: { type: "string", example: "Compra mensual" },
            ciudad: { type: "string", example: "Caracas" },
            pais: { type: "string", example: "Venezuela" },
            latitud: { type: "number", example: 10.48 },
            longitud: { type: "number", example: -66.9 },
            ip_origen: {
              type: "string",
              description: "Dirección IPv4 o IPv6 válida",
              example: "192.168.1.10",
            },
            fecha_transaccion: { type: "string", format: "date-time" },
            es_recurrente: { type: "boolean", default: false },
          },
        },
        RegisterDeviceRequest: {
          type: "object",
          required: ["identificador_unico", "tipo_dispositivo"],
          properties: {
            identificador_unico: { type: "string", example: "device-fingerprint-abc123" },
            tipo_dispositivo: { type: "string", maxLength: 50, example: "MOBILE" },
            sistema_operativo: { type: "string", maxLength: 100, example: "iOS 18" },
            navegador: { type: "string", maxLength: 100, example: "Safari" },
          },
        },
        UpdateDeviceTrustRequest: {
          type: "object",
          required: ["confiable"],
          properties: {
            confiable: { type: "boolean", example: true },
          },
        },
        UpdateAlertStatusRequest: {
          type: "object",
          required: ["estado"],
          properties: {
            estado: {
              type: "string",
              enum: ["PENDIENTE", "CONFIRMADA", "DESCARTADA"],
            },
            accion_usuario: {
              type: "string",
              enum: ["FUI_YO", "NO_FUI_YO", "BLOQUEAR_TARJETA"],
            },
          },
        },
        UpdateTransactionStatusRequest: {
          type: "object",
          required: ["estado"],
          properties: {
            estado: { type: "string", enum: ["CONFIRMADA", "RECHAZADA"] },
          },
        },
        CreateBudgetRequest: {
          type: "object",
          required: ["id_categoria", "limite_mensual", "mes", "anio"],
          properties: {
            id_categoria: { type: "integer", example: 1 },
            limite_mensual: { type: "number", example: 300 },
            mes: { type: "integer", minimum: 1, maximum: 12, example: 6 },
            anio: { type: "integer", minimum: 2020, maximum: 2100, example: 2026 },
          },
        },
        UpdateBudgetRequest: {
          type: "object",
          required: ["limite_mensual"],
          properties: {
            limite_mensual: { type: "number", example: 400 },
          },
        },
        CreateSavingsRequest: {
          type: "object",
          required: ["nombre", "monto_objetivo"],
          properties: {
            nombre: { type: "string", example: "Fondo de emergencia" },
            monto_objetivo: { type: "number", example: 1000 },
            monto_actual: { type: "number", example: 100 },
            fecha_limite: { type: "string", format: "date" },
          },
        },
        UpdateSavingsRequest: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            monto_objetivo: { type: "number" },
            fecha_limite: { type: "string", format: "date" },
            estado: {
              type: "string",
              enum: ["ACTIVA", "PAUSADA", "COMPLETADA", "CANCELADA"],
            },
          },
        },
        AddFundsRequest: {
          type: "object",
          required: ["monto"],
          properties: {
            monto: { type: "number", example: 50 },
          },
        },
        UpdateProfileRequest: {
          type: "object",
          properties: {
            nombre_completo: { type: "string", example: "Ana Pérez" },
            telefono: { type: "string", example: "+584121234567" },
          },
        },
      },
      responses: errorResponses,
      examples: {
        ValidationError: {
          summary: "Error de validación",
          value: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Error de validación de datos",
              details: [{ field: "monto", message: "El monto debe ser mayor a 0" }],
            },
          },
        },
        InvalidRelationError: {
          summary: "Referencia inválida (Prisma P2003)",
          value: {
            success: false,
            error: {
              code: "INVALID_REFERENCE",
              message: "Relación inválida: El recurso asociado no existe.",
            },
          },
        },
        DatabaseRecordError: {
          summary: "Conflicto de base de datos",
          value: {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "El recurso solicitado no fue encontrado.",
            },
          },
        },
        UnauthorizedError: {
          summary: "Autenticación requerida",
          value: {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token no proporcionado." },
          },
        },
        ForbiddenError: {
          summary: "Acceso denegado",
          value: {
            success: false,
            error: { code: "FORBIDDEN", message: "Permisos insuficientes para esta acción." },
          },
        },
        NotFoundError: {
          summary: "Recurso no encontrado",
          value: {
            success: false,
            error: { code: "NOT_FOUND", message: "Recurso no encontrado." },
          },
        },
        ConflictError: {
          summary: "Conflicto de estado o datos",
          value: {
            success: false,
            error: {
              code: "CONFLICT",
              message: "La operación entra en conflicto con los datos existentes.",
            },
          },
        },
        RateLimitError: {
          summary: "Límite de peticiones excedido",
          value: {
            success: false,
            error: {
              code: "RATE_LIMITED",
              message: "Límite de peticiones superado. Por favor ralentice sus solicitudes.",
            },
          },
        },
        InternalServerError: {
          summary: "Error interno",
          value: {
            success: false,
            error: {
              code: "INTERNAL_SERVER_ERROR",
              message: "Ocurrió un error interno en el servidor.",
            },
          },
        },
      },
    },
    paths: {
      // ───────────── HEALTH ─────────────
      "/health": {
        get: {
          tags: ["Health"],
          security: [],
          summary: "Healthcheck del backend",
          responses: {
            "200": {
              description: "Servicio operativo",
              content: {
                "application/json": {
                  example: {
                    status: "ok",
                    service: "trida-backend",
                    version: "2.0.0",
                  },
                },
              },
            },
          },
        },
      },

      // ───────────── AUTH ─────────────
      "/api/v2/auth/register": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Registrar usuario",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Registro recibido; el inicio de sesión puede requerir verificación por correo",
              content: {
                "application/json": {
                  example: {
                    status: "success",
                    data: {
                      message: "Si el correo puede registrarse, ya puedes intentar iniciar sesión",
                      emailVerificationRequired: false,
                    },
                  },
                },
              },
            },
            "400": {
              description: "Validación fallida",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v2/auth/login": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Iniciar sesión",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Login exitoso (devuelve JWT)" },
            "401": { description: "Credenciales inválidas" },
          },
        },
      },
      "/api/v2/auth/verify-email": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Verificar correo electrónico",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Correo verificado" },
            "400": { $ref: "#/components/responses/BadRequestError" },
          },
        },
      },
      "/api/v2/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Solicitar restablecimiento de contraseña",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Siempre devuelve el mismo mensaje; si la cuenta existe, se envían instrucciones por correo.",
            },
            "400": { description: "Correo inválido" },
          },
        },
      },
      "/api/v2/auth/verify-reset-token": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Verificar token de restablecimiento",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyResetTokenRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Token válido; no expone datos del usuario" },
            "400": { description: "Token no proporcionado o solicitud inválida" },
            "401": { description: "Token inválido o expirado" },
          },
        },
      },
      "/api/v2/auth/reset-password": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Restablecer contraseña",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Contraseña actualizada" },
            "400": { description: "Solicitud inválida" },
            "401": { description: "Token inválido o expirado" },
          },
        },
      },
      "/api/v2/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Usuario autenticado actual",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Perfil de sesión" },
            "401": { description: "No autenticado" },
          },
        },
        patch: {
          tags: ["Auth"],
          summary: "Actualizar perfil del usuario autenticado",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Perfil actualizado" },
            "400": { description: "Validación fallida" },
            "401": { description: "No autenticado" },
          },
        },
      },
      "/api/v2/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "Cambiar contraseña",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Contraseña actualizada" },
            "400": { description: "Validación fallida" },
            "401": { description: "No autenticado" },
          },
        },
      },

      // ───────────── ACCOUNTS ─────────────
      "/api/v2/accounts": {
        get: {
          tags: ["Accounts"],
          summary: "Listar cuentas del usuario",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de cuentas" } },
        },
        post: {
          tags: ["Accounts"],
          summary: "Crear cuenta",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateAccountRequest" },
              },
            },
          },
          responses: {
            "201": { description: "Cuenta creada" },
            "400": { description: "Validación fallida" },
          },
        },
      },
      "/api/v2/accounts/{id}": {
        get: {
          tags: ["Accounts"],
          summary: "Obtener cuenta por ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Cuenta encontrada" },
            "404": { description: "No encontrada" },
          },
        },
        patch: {
          summary: "Actualizar una cuenta bancaria",
          tags: ["Accounts"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
              description: "ID de la cuenta a actualizar",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nombre: { type: "string", example: "Banco Principal Editado" },
                    tipo: { type: "string", example: "BANCO" },
                    entidad: { type: "string", example: "BAC Credomatic" },
                    numero_enmascarado: { type: "string", example: "****9999" },
                    color: { type: "string", example: "#10b981" },
                    saldo_inicial: { type: "number", example: 1500 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Cuenta actualizada exitosamente" },
            404: { description: "Cuenta no encontrada" },
          },
        },
        delete: {
          tags: ["Accounts"],
          summary: "Eliminar cuenta",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Cuenta eliminada" } },
        },
      },

      // ───────────── CATEGORIES ─────────────
      "/api/v2/categories": {
        get: {
          tags: ["Categories"],
          summary: "Listar categorías (sistema + propias)",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de categorías" } },
        },
        post: {
          tags: ["Categories"],
          summary: "Crear categoría personalizada",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateCategoryRequest" },
              },
            },
          },
          responses: { "201": { description: "Categoría creada" } },
        },
      },
      "/api/v2/categories/{id}": {
        patch: {
          summary: "Actualizar una categoría de transacción",
          tags: ["Categories"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
              description: "ID de la categoría a actualizar",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nombre: { type: "string", example: "Comida y Restaurantes" },
                    tipo: { type: "string", example: "GASTO" },
                    icono: { type: "string", example: "utensils" },
                    color: { type: "string", example: "#ef4444" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Categoría actualizada exitosamente" },
            403: { description: "No se pueden modificar categorías del sistema" },
            404: { description: "Categoría no encontrada" },
          },
        },
        delete: {
          tags: ["Categories"],
          summary: "Eliminar categoría propia",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Categoría eliminada" } },
        },
      },

      // ───────────── TRANSACTIONS ─────────────
      "/api/v2/transactions": {
        get: {
          tags: ["Transactions"],
          summary: "Listar transacciones paginadas",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, default: 10 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
            {
              name: "estado",
              in: "query",
              schema: {
                type: "string",
                enum: ["PENDIENTE", "CONFIRMADA", "APROBADA", "SOSPECHOSA", "RECHAZADA"],
              },
            },
            {
              name: "nivel_riesgo",
              in: "query",
              schema: {
                type: "string",
                enum: ["BAJO", "MEDIO", "ALTO", "CRITICO", "ALL"],
                example: "ALTO",
              },
            },
            {
              name: "tipo_movimiento",
              in: "query",
              schema: { type: "string", enum: ["INGRESO", "GASTO", "AHORRO"] },
            },
            { name: "id_cuenta", in: "query", schema: { type: "integer" } },
            { name: "id_categoria", in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "min_monto", in: "query", schema: { type: "number" } },
            { name: "max_monto", in: "query", schema: { type: "number" } },
            {
              name: "fecha_inicio",
              in: "query",
              schema: {
                oneOf: [
                  { type: "string", format: "date-time" },
                  { type: "string", format: "date" },
                ],
              },
            },
            {
              name: "fecha_fin",
              in: "query",
              schema: {
                oneOf: [
                  { type: "string", format: "date-time" },
                  { type: "string", format: "date" },
                ],
              },
            },
            {
              name: "sort_by",
              in: "query",
              schema: {
                type: "string",
                enum: ["fecha_transaccion", "monto", "tipo_movimiento", "nivel_riesgo"],
                default: "fecha_transaccion",
              },
            },
            { name: "sort_order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          ],
          responses: { "200": { description: "Listado paginado" } },
        },
        post: {
          tags: ["Transactions"],
          summary: "Crear transacción (evaluación de riesgo incluida)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTransactionRequest" },
              },
            },
          },
          responses: {
            "201": { description: "Transacción creada + evaluación" },
            "400": { description: "Validación fallida" },
            "404": {
              description: "Cuenta o categoría inexistente o no disponible para el usuario",
            },
          },
        },
      },
      "/api/v2/transactions/counts-by-level": {
        get: {
          tags: ["Transactions"],
          summary: "Conteos por nivel de riesgo",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Conteos por nivel: BAJO, MEDIO, ALTO y CRITICO" } },
        },
      },
      "/api/v2/transactions/{id}": {
        get: {
          tags: ["Transactions"],
          summary: "Detalle de transacción",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Transacción encontrada" },
            "404": { description: "No encontrada" },
          },
        },
        delete: {
          tags: ["Transactions"],
          summary: "Eliminar transacción (revierte saldo si aplica)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Eliminada" } },
        },
      },
      "/api/v2/transactions/{id}/status": {
        patch: {
          tags: ["Transactions"],
          summary: "Resolver una transacción pendiente",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateTransactionStatusRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Transacción pendiente resuelta" },
            "400": { description: "Estado inválido" },
            "404": { description: "Transacción no encontrada" },
            "409": { description: "La transacción ya no está pendiente" },
          },
        },
      },

      // ───────────── DEVICES ─────────────
      "/api/v2/devices": {
        get: {
          tags: ["Devices"],
          summary: "Listar dispositivos",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de dispositivos" } },
        },
        post: {
          tags: ["Devices"],
          summary: "Registrar o actualizar dispositivo",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterDeviceRequest" },
              },
            },
          },
          responses: { "201": { description: "Dispositivo registrado/actualizado" } },
        },
      },
      "/api/v2/devices/{id}": {
        get: {
          tags: ["Devices"],
          summary: "Detalle de dispositivo",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Dispositivo encontrado" },
            "404": { description: "No encontrado" },
          },
        },
        delete: {
          tags: ["Devices"],
          summary: "Eliminar dispositivo",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Eliminado" } },
        },
      },
      "/api/v2/devices/{id}/trust": {
        patch: {
          tags: ["Devices"],
          summary: "Actualizar estado de confianza",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateDeviceTrustRequest" },
              },
            },
          },
          responses: { "200": { description: "Estado actualizado" } },
        },
      },

      // ───────────── ALERTS ─────────────
      "/api/v2/alerts": {
        get: {
          tags: ["Alerts"],
          summary: "Listar alertas paginadas",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
            {
              name: "severidad",
              in: "query",
              schema: { type: "string", enum: ["BAJA", "MEDIA", "ALTA", "CRITICA"] },
            },
            {
              name: "estado",
              in: "query",
              schema: { type: "string", enum: ["PENDIENTE", "CONFIRMADA", "DESCARTADA"] },
            },
            {
              name: "sort_by",
              in: "query",
              schema: { type: "string", enum: ["fecha_detectada", "severidad", "estado"] },
            },
            { name: "sort_order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          ],
          responses: { "200": { description: "Listado paginado" } },
        },
      },
      "/api/v2/alerts/counts-by-level": {
        get: {
          tags: ["Alerts"],
          summary: "Conteos de alertas por nivel",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Conteos por criticidad" } },
        },
      },
      "/api/v2/alerts/{id}": {
        get: {
          tags: ["Alerts"],
          summary: "Detalle de alerta",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Alerta encontrada" },
            "400": { description: "ID inválido" },
            "404": { description: "No encontrada" },
          },
        },
      },
      "/api/v2/alerts/{id}/status": {
        patch: {
          tags: ["Alerts"],
          summary: "Actualizar estado de alerta",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateAlertStatusRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Estado actualizado" },
            "400": { description: "ID o payload inválido" },
            "404": { description: "Alerta no encontrada" },
          },
        },
      },

      // ───────────── DASHBOARD ─────────────
      "/api/v2/dashboard/stats": {
        get: {
          tags: ["Dashboard"],
          summary: "Estadísticas principales",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id_cuenta",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
          ],
          responses: { "200": { description: "Saldos, mes actual y alertas" } },
        },
      },
      "/api/v2/dashboard/estadisticas": {
        get: {
          tags: ["Dashboard"],
          summary: "Estadísticas principales (alias ES)",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Saldos, mes actual y alertas" } },
        },
      },
      "/api/v2/dashboard/recent-alerts": {
        get: {
          tags: ["Dashboard"],
          summary: "Alertas recientes",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 5 } }],
          responses: { "200": { description: "Lista corta de alertas" } },
        },
      },
      "/api/v2/dashboard/alertas-recientes": {
        get: {
          tags: ["Dashboard"],
          summary: "Alertas recientes (alias ES)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 5 } }],
          responses: { "200": { description: "Lista corta de alertas" } },
        },
      },
      "/api/v2/dashboard/recent-transactions": {
        get: {
          tags: ["Dashboard"],
          summary: "Transacciones recientes",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 5 } }],
          responses: { "200": { description: "Lista corta de transacciones" } },
        },
      },
      "/api/v2/dashboard/transacciones-recientes": {
        get: {
          tags: ["Dashboard"],
          summary: "Transacciones recientes (alias ES)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 5 } }],
          responses: { "200": { description: "Lista corta de transacciones" } },
        },
      },
      "/api/v2/dashboard/advice": {
        get: {
          tags: ["Dashboard"],
          summary: "Consejos financieros no leídos",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Consejos recientes generados por reglas del sistema" },
          },
        },
      },
      "/api/v2/dashboard/advice/{id}/read": {
        patch: {
          tags: ["Dashboard"],
          summary: "Marcar un consejo como leído",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1 },
            },
          ],
          responses: {
            "200": { description: "Consejo marcado como leído" },
            "404": { description: "Consejo no encontrado" },
          },
        },
      },

      // ───────────── BUDGETS ─────────────
      "/api/v2/budgets": {
        get: {
          tags: ["Budgets"],
          summary: "Listar presupuestos con gasto calculado",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id_cuenta", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "mes", in: "query", schema: { type: "integer", minimum: 1, maximum: 12 } },
            { name: "anio", in: "query", schema: { type: "integer", minimum: 2020, maximum: 2100 } },
          ],
          responses: { "200": { description: "Lista de presupuestos" } },
        },
        post: {
          tags: ["Budgets"],
          summary: "Crear presupuesto",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateBudgetRequest" },
              },
            },
          },
          responses: { "201": { description: "Presupuesto creado" } },
        },
      },
      "/api/v2/budgets/{id}": {
        patch: {
          tags: ["Budgets"],
          summary: "Actualizar presupuesto",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateBudgetRequest" },
              },
            },
          },
          responses: { "200": { description: "Presupuesto actualizado" } },
        },
        delete: {
          tags: ["Budgets"],
          summary: "Eliminar presupuesto",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Eliminado" } },
        },
      },

      // ───────────── SAVINGS ─────────────
      "/api/v2/savings": {
        get: {
          tags: ["Savings"],
          summary: "Listar metas de ahorro",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista de metas" } },
        },
        post: {
          tags: ["Savings"],
          summary: "Crear meta de ahorro",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateSavingsRequest" },
              },
            },
          },
          responses: { "201": { description: "Meta creada" } },
        },
      },
      "/api/v2/savings/{id}": {
        patch: {
          tags: ["Savings"],
          summary: "Actualizar meta de ahorro",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateSavingsRequest" },
              },
            },
          },
          responses: { "200": { description: "Meta actualizada" } },
        },
        delete: {
          tags: ["Savings"],
          summary: "Eliminar meta de ahorro",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { "200": { description: "Eliminada" } },
        },
      },
      "/api/v2/savings/{id}/funds": {
        post: {
          tags: ["Savings"],
          summary: "Agregar fondos a una meta",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AddFundsRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Aporte registrado y meta actualizada" },
            "400": { description: "ID o monto inválido" },
            "404": { description: "Meta no encontrada para el usuario" },
            "409": { description: "La meta no está activa" },
          },
        },
      },

      // ───────────── PROFILE ─────────────
      "/api/v2/profile": {
        get: {
          tags: ["Profile"],
          summary: "Alias compatible de GET /auth/me",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Perfil" } },
        },
        patch: {
          tags: ["Profile"],
          summary: "Alias compatible de PATCH /auth/me",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
              },
            },
          },
          responses: { "200": { description: "Perfil actualizado" } },
        },
      },
      "/api/v2/profile/behavior-pattern": {
        get: {
          tags: ["Profile"],
          summary: "Patrón de comportamiento financiero",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Patrón o null" } },
        },
      },

      // ───────────── INSIGHTS ─────────────
      "/api/v2/insights": {
        get: {
          tags: ["Insights"],
          summary: "Insights y consejos financieros",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "periodo_dias",
              in: "query",
              schema: { type: "integer", default: 30, minimum: 7, maximum: 365 },
            },
          ],
          responses: {
            "200": {
              description: "Resumen, top categorías/comercios y consejos",
            },
          },
        },
      },

      // ───────────── REPORTS ─────────────
      "/api/v2/reports/summary": {
        get: {
          tags: ["Reports"],
          summary: "Resumen financiero por periodo",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "fecha_inicio",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "fecha_fin",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "id_cuenta",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
          ],
          responses: { "200": { description: "Totales e indicadores" } },
        },
      },
      "/api/v2/reports/by-category": {
        get: {
          tags: ["Reports"],
          summary: "Desglose por categoría",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "fecha_inicio",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "fecha_fin",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "id_cuenta",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "tipo_movimiento",
              in: "query",
              schema: { type: "string", enum: ["INGRESO", "GASTO", "AHORRO"] },
            },
          ],
          responses: { "200": { description: "Totales por categoría" } },
        },
      },
      "/api/v2/reports/transactions": {
        get: {
          tags: ["Reports"],
          summary: "Detalle exportable de transacciones",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "fecha_inicio",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "fecha_fin",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "id_cuenta",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "tipo_movimiento",
              in: "query",
              schema: { type: "string", enum: ["INGRESO", "GASTO", "AHORRO"] },
            },
            { name: "limit", in: "query", schema: { type: "integer", default: 500 } },
          ],
          responses: {
            "200": {
              description: "Listado paginado con total real, truncated y cinco comercios principales",
            },
          },
        },
      },

      // ───────────── MAP ─────────────
      "/api/v2/map/stats": {
        get: {
          tags: ["Map"],
          summary: "Estadísticas geográficas",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id_cuenta",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
          ],
          responses: {
            "200": {
              description: "Conteos de ubicaciones y riesgo geográfico",
            },
          },
        },
      },
      "/api/v2/map/locations": {
        get: {
          tags: ["Map"],
          summary: "Marcadores de transacciones geolocalizadas",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id_cuenta",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 500, minimum: 1, maximum: 2000 },
            },
            {
              name: "nivel_riesgo",
              in: "query",
              schema: { type: "string", enum: ["BAJO", "MEDIO", "ALTO", "CRITICO", "ALL"] },
            },
            {
              name: "estado",
              in: "query",
              schema: {
                type: "string",
                enum: ["PENDIENTE", "CONFIRMADA", "APROBADA", "SOSPECHOSA", "RECHAZADA", "ALL"],
              },
            },
            {
              name: "fecha_inicio",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "fecha_fin",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
          ],
          responses: { "200": { description: "items + total + truncated" } },
        },
      },
      "/api/v2/map/ubicaciones": {
        get: {
          tags: ["Map"],
          summary: "Marcadores geolocalizados (alias ES)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 500, minimum: 1, maximum: 2000 },
            },
            {
              name: "nivel_riesgo",
              in: "query",
              schema: { type: "string", enum: ["BAJO", "MEDIO", "ALTO", "CRITICO", "ALL"] },
            },
            {
              name: "estado",
              in: "query",
              schema: {
                type: "string",
                enum: ["PENDIENTE", "CONFIRMADA", "APROBADA", "SOSPECHOSA", "RECHAZADA", "ALL"],
              },
            },
            {
              name: "fecha_inicio",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
            {
              name: "fecha_fin",
              in: "query",
              schema: { type: "string", description: "Fecha ISO 8601 (fecha o fecha-hora)" },
            },
          ],
          responses: { "200": { description: "items + total + truncated" } },
        },
      },
    },
  },
  apis: [],
};

type SwaggerResponse = {
  $ref?: string;
  description?: string;
  content?: unknown;
  [key: string]: unknown;
};

type SwaggerOperation = {
  security?: unknown[];
  responses?: Record<string, SwaggerResponse>;
};

const generatedSwaggerSpec = swaggerJsdoc(options);
const paths = (
  generatedSwaggerSpec as unknown as { paths?: Record<string, Record<string, unknown>> }
).paths;
const httpMethods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

for (const [path, pathItem] of Object.entries(paths ?? {})) {
  for (const [method, rawOperation] of Object.entries(pathItem)) {
    if (!httpMethods.has(method) || typeof rawOperation !== "object" || rawOperation === null) {
      continue;
    }

    const operation = rawOperation as SwaggerOperation;
    const responses = operation.responses ?? {};
    const statuses = new Set(
      Object.keys(responses).filter((status) => status in errorResponseComponentByStatus),
    );

    if (path.startsWith("/api/v2/")) {
      statuses.add("400");
      statuses.add("409");
      statuses.add("429");
      statuses.add("500");

      if (operation.security?.length) {
        statuses.add("401");
        statuses.add("403");
      }

      if (
        path.includes("{id}") ||
        (method === "post" && (path === "/api/v2/transactions" || path === "/api/v2/budgets"))
      ) {
        statuses.add("404");
      }

      if (method === "post" && path === "/api/v2/devices") {
        statuses.add("409");
      }
    } else if (path === "/health") {
      statuses.add("429");
      statuses.add("500");
    }

    for (const status of statuses) {
      const componentName = errorResponseComponentByStatus[status];
      const existing = responses[status];
      responses[status] = existing
        ? {
            ...existing,
            content: errorContentByStatus[status as keyof typeof errorContentByStatus],
          }
        : { $ref: `#/components/responses/${componentName}` };
    }

    if (path.startsWith("/api/v2/")) {
      for (const [status, response] of Object.entries(responses)) {
        if (!/^2\d\d$/.test(status) || response.$ref) continue;

        const content =
          typeof response.content === "object" && response.content !== null
            ? (response.content as Record<
                string,
                { schema?: { $ref?: string }; [key: string]: unknown }
              >)
            : {};
        const jsonContent = content["application/json"] ?? {};
        responses[status] = {
          ...response,
          content: {
            ...content,
            "application/json": {
              ...jsonContent,
              schema: { $ref: "#/components/schemas/SuccessResponse" },
            },
          },
        };
      }
    }

    operation.responses = responses;
  }
}

export const swaggerSpec = generatedSwaggerSpec;
