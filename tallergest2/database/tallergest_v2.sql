-- ============================================================
-- BASE DE DATOS: Sistema de Gestión de Taller Mecánico (TallerGest v2)
-- Motor: MySQL Workbench 8.0 / MySQL Server 8.0
-- Archivo: database/tallergest_v2.sql
-- ============================================================

-- 1.Creación de la base de datos de la versión 2

CREATE DATABASE IF NOT EXISTS tallergest_v2_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE tallergest_v2_db;

-- ------------------------------------------------------------
-- MÓDULO 1: ADMINISTRACIÓN Y SEGURIDAD (ISeguridad, IAuditable)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    permisos TEXT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    clave VARCHAR(255) NOT NULL, -- Hash cifrado (BCrypt / Argon2)
    rol_id BIGINT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS logs_auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    accion VARCHAR(255) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id BIGINT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MÓDULO 2: CLIENTES Y VEHÍCULOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehiculos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(15) NOT NULL UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    cliente_id BIGINT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_mantenimiento (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id BIGINT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MÓDULO 3: RECEPCIÓN Y DIAGNÓSTICO DE VEHÍCULOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recepciones_vehiculo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id BIGINT NOT NULL,
    fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS diagnosticos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recepcion_id BIGINT NOT NULL,
    hallazgos TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recepcion_id) REFERENCES recepciones_vehiculo(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MÓDULO 4: MECÁNICOS Y ÓRDENES DE TRABAJO (EstadoOrden)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mecanicos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recepcion_id BIGINT NOT NULL,
    mecanico_id BIGINT NULL,
    estado ENUM('recibida', 'diagnosticada', 'cotizada', 'aprobada', 'en_ejecucion', 'finalizada', 'facturada') 
        DEFAULT 'recibida',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recepcion_id) REFERENCES recepciones_vehiculo(id) ON DELETE CASCADE,
    FOREIGN KEY (mecanico_id) REFERENCES mecanicos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MÓDULO 5: SERVICIOS Y REPUESTOS (INVENTARIO)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    costo_mano_obra DECIMAL(10,2) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repuestos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    existencia INT NOT NULL DEFAULT 0,
    precio_unitario DECIMAL(10,2) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tablas interactivas para detalle de consumos en Órdenes
CREATE TABLE IF NOT EXISTS orden_servicios (
    orden_id BIGINT NOT NULL,
    servicio_id BIGINT NOT NULL,
    costo DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (orden_id, servicio_id),
    FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orden_repuestos (
    orden_id BIGINT NOT NULL,
    repuesto_id BIGINT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (orden_id, repuesto_id),
    FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (repuesto_id) REFERENCES repuestos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MÓDULO 6: COTIZACIONES, APROBACIÓN, FACTURACIÓN Y PAGOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotizaciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    orden_id BIGINT NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    vigencia DATE NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalles_cotizacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id BIGINT NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS aprobaciones_cliente (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id BIGINT NOT NULL,
    aprobado BOOLEAN NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facturas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id BIGINT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    factura_id BIGINT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(50) NOT NULL, -- Efectivo, Tarjeta, Transferencia, Pasarela COTS
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -- ------------------------------------------------------------
-- -- DATOS SEMILLA (INSERCIONES INICIALES PARA PRUEBAS Y LOGIN)
-- -- ------------------------------------------------------------
-- INSERT INTO roles (id, nombre, permisos) VALUES 
-- (1, 'Administrador', '["ALL"]'),
-- (2, 'Mecánico', '["ORDENES_VER", "DIAGNOSTICO_CREAR"]'),
-- (3, 'Recepcionista', '["CLIENTES_ALL", "VEHICULOS_ALL", "RECEPCION_CREAR"]');

-- -- Usuario Administrador inicial para probar el Login (Contraseña: Admin123!)
-- INSERT INTO usuarios (nombre_usuario, clave, rol_id) VALUES 
-- ('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 1);

-- -- ============================================================
-- -- DATOS DE PRUEBA (SEED DATA) PARA TALLERGEST V2
-- -- Base de datos: tallergest_v2_db
-- -- ============================================================

-- USE tallergest_v2_db;

-- -- Desactivar temporalmente revisión de llaves foráneas para reinicio limpio
-- SET FOREIGN_KEY_CHECKS = 0;

-- TRUNCATE TABLE pagos;
-- TRUNCATE TABLE facturas;
-- TRUNCATE TABLE aprobaciones_cliente;
-- TRUNCATE TABLE detalles_cotizacion;
-- TRUNCATE TABLE cotizaciones;
-- TRUNCATE TABLE orden_repuestos;
-- TRUNCATE TABLE orden_servicios;
-- TRUNCATE TABLE repuestos;
-- TRUNCATE TABLE servicios;
-- TRUNCATE TABLE ordenes_trabajo;
-- TRUNCATE TABLE mecanicos;
-- TRUNCATE TABLE diagnosticos;
-- TRUNCATE TABLE recepciones_vehiculo;
-- TRUNCATE TABLE historial_mantenimiento;
-- TRUNCATE TABLE vehiculos;
-- TRUNCATE TABLE clientes;
-- TRUNCATE TABLE logs_auditoria;
-- TRUNCATE TABLE usuarios;
-- TRUNCATE TABLE roles;

-- SET FOREIGN_KEY_CHECKS = 1;

-- -- ------------------------------------------------------------
-- -- 1. ROLES Y USUARIOS
-- -- Contraseña para todos los usuarios de prueba: Admin123!
-- -- ------------------------------------------------------------
-- INSERT INTO roles (id, nombre, permisos) VALUES 
-- (1, 'Administrador', '["ALL"]'),
-- (2, 'Mecánico', '["ORDENES_VER", "DIAGNOSTICO_CREAR"]'),
-- (3, 'Recepcionista', '["CLIENTES_ALL", "VEHICULOS_ALL", "RECEPCION_CREAR"]');

-- INSERT INTO usuarios (id, nombre_usuario, clave, rol_id) VALUES 
-- (1, 'admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 1),
-- (2, 'recepcion', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 3),
-- (3, 'mecanico1', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 2);

-- -- ------------------------------------------------------------
-- -- 2. CLIENTES Y VEHÍCULOS
-- -- ------------------------------------------------------------
-- INSERT INTO clientes (id, nombre, telefono, correo) VALUES 
-- (1, 'Juan Pérez Rodríguez', '809-555-0101', 'juan.perez@email.com'),
-- (2, 'María Almonte López', '809-555-0202', 'maria.almonte@email.com'),
-- (3, 'Carlos Gómez Santos', '809-555-0303', 'carlos.gomez@email.com'),
-- (4, 'Ana Martínez Castillo', '809-555-0404', 'ana.martinez@email.com');

-- INSERT INTO vehiculos (id, placa, marca, modelo, anio, cliente_id) VALUES 
-- (1, 'A123456', 'Toyota', 'Corolla', 2018, 1),
-- (2, 'B654321', 'Honda', 'Civic', 2020, 2),
-- (3, 'C987654', 'Hyundai', 'Tucson', 2021, 3),
-- (4, 'D456789', 'Nissan', 'Sentra', 2017, 4);

-- INSERT INTO historial_mantenimiento (id, vehiculo_id, fecha, descripcion) VALUES 
-- (1, 1, '2025-11-10 10:00:00', 'Cambio de aceite de motor y filtro de aire general.'),
-- (2, 2, '2025-12-05 14:30:00', 'Revisión del sistema de frenos delanteros y reemplazo de pastillas.');

-- -- ------------------------------------------------------------
-- -- 3. MECÁNICOS
-- -- ------------------------------------------------------------
-- INSERT INTO mecanicos (id, nombre, especialidad, disponible) VALUES 
-- (1, 'Roberto Sánchez', 'Diagnóstico y Motor', TRUE),
-- (2, 'Pedro Almonte', 'Frenos y Suspensión', TRUE),
-- (3, 'Luis Fernández', 'Electricidad y Climatización', TRUE);

-- -- ------------------------------------------------------------
-- -- 4. INVENTARIO (SERVICIOS Y REPUESTOS)
-- -- ------------------------------------------------------------
-- INSERT INTO servicios (id, nombre, costo_mano_obra) VALUES 
-- (1, 'Cambio de Aceite y Filtro', 1200.00),
-- (2, 'Alineación y Balanceo de Neumáticos', 1800.00),
-- (3, 'Diagnóstico Electrónico por Escáner', 1500.00),
-- (4, 'Rectificación de Discos de Freno', 2200.00),
-- (5, 'Mantenimiento de Sistema de Aire Acondicionado', 3000.00);

-- INSERT INTO repuestos (id, nombre, existencia, precio_unitario) VALUES 
-- (1, 'Aceite Sintético 5W-30 (Galón)', 25, 2200.00),
-- (2, 'Filtro de Aceite Toyota/Honda', 40, 450.00),
-- (3, 'Pastillas de Freno Delanteras', 15, 2800.00),
-- (4, 'Bujías de Iridium (Juego x4)', 12, 3200.00),
-- (5, 'Batería 12V 60Ah', 8, 5500.00),
-- (6, 'Filtro de Aire de Motor', 30, 600.00);

-- -- ------------------------------------------------------------
-- -- 5. RECEPCIONES Y DIAGNÓSTICOS
-- -- ------------------------------------------------------------
-- INSERT INTO recepciones_vehiculo (id, vehiculo_id, fecha_recepcion, observaciones) VALUES 
-- (1, 1, '2026-10-10 09:15:00', 'Cliente reporta ruido metálico al frenar y luz de Check Engine encendida.'),
-- (2, 2, '2026-10-12 11:30:00', 'Mantenimiento preventivo de los 50,000 km.'),
-- (3, 3, '2026-10-15 08:45:00', 'Aire acondicionado no enfría correctamente.');

-- INSERT INTO diagnosticos (id, recepcion_id, hallazgos) VALUES 
-- (1, 1, 'Pastillas de freno desgastadas al 90%. Código de falla P0300 (misfire) debido a bujías desgastadas.'),
-- (2, 2, 'Filtros y aceite de motor en mal estado. Requiere cambio de aceite, filtro de aire y balanceo.');

-- -- ------------------------------------------------------------
-- -- 6. ÓRDENES DE TRABAJO Y CONSUMOS
-- -- ------------------------------------------------------------
-- INSERT INTO ordenes_trabajo (id, recepcion_id, mecanico_id, estado) VALUES 
-- (1, 1, 2, 'en_ejecucion'),
-- (2, 2, 1, 'cotizada'),
-- (3, 3, 3, 'recibida');

-- -- Consumo en Orden #1
-- INSERT INTO orden_servicios (orden_id, servicio_id, costo) VALUES 
-- (1, 3, 1500.00),
-- (1, 4, 2200.00);

-- INSERT INTO orden_repuestos (orden_id, repuesto_id, cantidad, precio_unitario) VALUES 
-- (1, 3, 1, 2800.00),
-- (1, 4, 1, 3200.00);

-- -- Consumo en Orden #2
-- INSERT INTO orden_servicios (orden_id, servicio_id, costo) VALUES 
-- (2, 1, 1200.00),
-- (2, 2, 1800.00);

-- INSERT INTO orden_repuestos (orden_id, repuesto_id, cantidad, precio_unitario) VALUES 
-- (2, 1, 1, 2200.00),
-- (2, 2, 1, 450.00),
-- (2, 6, 1, 600.00);

-- -- ------------------------------------------------------------
-- -- 7. COTIZACIONES, APROBACIONES, FACTURAS Y PAGOS
-- -- ------------------------------------------------------------
-- INSERT INTO cotizaciones (id, orden_id, total, vigencia) VALUES 
-- (1, 1, 9700.00, '2026-10-30'),
-- (2, 2, 6250.00, '2026-10-30');

-- INSERT INTO detalles_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, subtotal) VALUES 
-- (1, 'Diagnóstico Electrónico por Escáner', 1, 1500.00, 1500.00),
-- (2, 'Rectificación de Discos de Freno', 1, 2200.00, 2200.00),
-- (3, 'Pastillas de Freno Delanteras', 1, 2800.00, 2800.00),
-- (4, 'Bujías de Iridium (Juego x4)', 1, 3200.00, 3200.00),
-- (5, 'Cambio de Aceite y Filtro', 1, 1200.00, 1200.00),
-- (6, 'Alineación y Balanceo de Neumáticos', 1, 1800.00, 1800.00),
-- (7, 'Aceite Sintético 5W-30 (Galón)', 1, 2200.00, 2200.00),
-- (8, 'Filtro de Aceite Toyota/Honda', 1, 450.00, 450.00),
-- (9, 'Filtro de Aire de Motor', 1, 600.00, 600.00);

-- INSERT INTO aprobaciones_cliente (id, cotizacion_id, aprobado) VALUES 
-- (1, 1, TRUE);

-- INSERT INTO facturas (id, cotizacion_id, total) VALUES 
-- (1, 1, 9700.00);

-- INSERT INTO pagos (id, factura_id, monto, metodo) VALUES 
-- (1, 1, 9700.00, 'Tarjeta');

-- -- ------------------------------------------------------------
-- -- 8. AUDITORÍA INICIAL
-- -- ------------------------------------------------------------
-- INSERT INTO logs_auditoria (accion, usuario_id) VALUES 
-- ('Carga de datos semilla de prueba completada', 1);