-- ============================================================
-- SPRINT 1 - Script SQL
-- Historias de usuario: registro, login, ejercicios,
-- recompensas, cartas, módulos/pasos
-- ============================================================

-- ------------------------------------------------------------
-- 1. USUARIO
-- HU: registro con email/username, login, dashboard con puntos
-- ------------------------------------------------------------
CREATE TABLE Usuario (
    id_usuario      INT(3)       NOT NULL AUTO_INCREMENT,
    username        VARCHAR(150) NOT NULL UNIQUE,
    correo          VARCHAR(150) NOT NULL UNIQUE,
    contrasena      VARCHAR(500) NOT NULL,          -- hash bcrypt/argon2
    puntos          INT(7)       NOT NULL DEFAULT 0,
    monedas         INT(7)       NOT NULL DEFAULT 0,
    salud           INT(3)       NOT NULL DEFAULT 100,
    mana            INT(3)       NOT NULL DEFAULT 100,
    daño_habilidad  INT(3)       NOT NULL DEFAULT 0,
    es_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
    racha_ejercicios INT(3)      NOT NULL DEFAULT 0,
    tiempo_jugado   DECIMAL(4,2) NOT NULL DEFAULT 0,
    total_cartas    INT(3)       NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario)
);

-- ------------------------------------------------------------
-- 2. EJERCICIO
-- HU: ver ejercicios pendientes, detalle con casos de prueba,
--     dificultad y enlace al repo template de GitHub
-- ------------------------------------------------------------
CREATE TABLE Ejercicio (
    id_ejercicio      INT(3)        NOT NULL AUTO_INCREMENT,
    titulo            VARCHAR(100)  NOT NULL,
    descripcion       VARCHAR(200)  NOT NULL,
    dificultad        VARCHAR(200)  NOT NULL,
    casos_prueba      VARCHAR(1000) NOT NULL,        -- JSON con inputs/outputs
    lenguaje          VARCHAR(100)  NOT NULL,
    tiempo_estimado   DECIMAL(4,2)  NOT NULL,
    repo_template     VARCHAR(500)  NULL,            -- URL al repo GitHub template
    PRIMARY KEY (id_ejercicio)
);

-- ------------------------------------------------------------
-- 3. EJERCICIO_ACTIVO
-- HU: ejercicios pendientes en el menú principal (máx 5),
--     estado pendiente/resuelto
-- ------------------------------------------------------------
CREATE TABLE Ejercicio_Activo (
    id_ejercicio_activo INT(3)  NOT NULL AUTO_INCREMENT,
    id_ejercicio        INT(3)  NOT NULL,
    id_usuario          INT(3)  NOT NULL,
    estado              VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- pendiente | resuelto
    fecha_asignacion    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_ejercicio_activo),
    FOREIGN KEY (id_ejercicio) REFERENCES Ejercicio(id_ejercicio),
    FOREIGN KEY (id_usuario)   REFERENCES Usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 4. EJERCICIO_RESUELTO
-- HU: envío a revisión via webhook (EXERCISE_SUBMIT),
--     resultado correcto/incorrecto en < 10 s,
--     tiempo de resolución visible
-- ------------------------------------------------------------
CREATE TABLE Ejercicio_Resuelto (
    id_ejercicioResuelto INT(3)        NOT NULL AUTO_INCREMENT,
    id_ejercicio         INT(3)        NOT NULL,
    id_usuario           INT(3)        NOT NULL,     -- resuelto por
    fecha_resuelto       DATE          NOT NULL,
    tiempo_resolucion    DECIMAL(4,2)  NOT NULL,     -- minutos
    correcto             BOOLEAN       NOT NULL,
    PRIMARY KEY (id_ejercicioResuelto),
    FOREIGN KEY (id_ejercicio) REFERENCES Ejercicio(id_ejercicio),
    FOREIGN KEY (id_usuario)   REFERENCES Usuario(id_usuario)
);

-- ------------------------------------------------------------
-- 5. RECOMPENSA
-- HU: +10 puntos y carta aleatoria al resolver correctamente;
--     notificación de recompensa
-- ------------------------------------------------------------
CREATE TABLE Recompensa (
    id_recompensa  INT(3)        NOT NULL AUTO_INCREMENT,
    id_ejercicio   INT(3)        NOT NULL,
    tipo           VARCHAR(100)  NOT NULL,           -- 'puntos' | 'carta'
    probabilidad   DECIMAL(3,2)  NOT NULL,           -- 0.00 – 1.00
    cantidad       INT(3)        NOT NULL,
    PRIMARY KEY (id_recompensa),
    FOREIGN KEY (id_ejercicio) REFERENCES Ejercicio(id_ejercicio)
);

-- ------------------------------------------------------------
-- 6. CARTA / CARTA_NIVEL / HABILIDAD
-- HU: carta coleccionable recibida como recompensa,
--     contador de cartas en el dashboard
-- ------------------------------------------------------------
CREATE TABLE Habilidad (
    id_habilidad  INT(3)       NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(150) NOT NULL,
    PRIMARY KEY (id_habilidad)
);

CREATE TABLE Carta_Nivel (
    id_carta_nivel  INT(3)  NOT NULL AUTO_INCREMENT,
    nivel           INT(3)  NOT NULL,
    daño            INT(3)  NOT NULL,
    salud           INT(3)  NOT NULL,
    mana            INT(3)  NOT NULL,
    maná            INT(3)  NOT NULL,
    daño_habilidad  INT(3)  NOT NULL,
    id_carta        INT(3)  NOT NULL,               -- FK añadida tras CREATE Carta
    id_habilidad    INT(3)  NOT NULL,
    PRIMARY KEY (id_carta_nivel),
    FOREIGN KEY (id_habilidad) REFERENCES Habilidad(id_habilidad)
);

CREATE TABLE Carta (
    id_carta        INT(3)       NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     VARCHAR(150) NOT NULL,
    rareza          VARCHAR(100) NOT NULL,
    imagen          VARCHAR(250) NOT NULL,
    id_usuario_carta INT(3)      NOT NULL,           -- FK a Usuario_Carta
    id_carta_nivel  INT(3)       NOT NULL,
    PRIMARY KEY (id_carta),
    FOREIGN KEY (id_carta_nivel) REFERENCES Carta_Nivel(id_carta_nivel)
);

-- FK circular: Carta_Nivel → Carta
ALTER TABLE Carta_Nivel
    ADD CONSTRAINT fk_cartanivel_carta
    FOREIGN KEY (id_carta) REFERENCES Carta(id_carta);

-- ------------------------------------------------------------
-- 7. USUARIO_CARTA
-- HU: inventario de cartas del jugador,
--     contador automático al obtener nuevas cartas
-- ------------------------------------------------------------
CREATE TABLE Usuario_Carta (
    id_usuario_carta  INT(3)   NOT NULL AUTO_INCREMENT,
    nivel_actual      INT(2)   NOT NULL DEFAULT 1,
    mazo              BOOLEAN  NOT NULL DEFAULT FALSE,
    id_usuario        INT(3)   NOT NULL,
    id_carta          INT(3)   NOT NULL,
    PRIMARY KEY (id_usuario_carta),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_carta)   REFERENCES Carta(id_carta)
);

-- FK de Carta → Usuario_Carta (circular)
ALTER TABLE Carta
    ADD CONSTRAINT fk_carta_usuariocarta
    FOREIGN KEY (id_usuario_carta) REFERENCES Usuario_Carta(id_usuario_carta);

-- ------------------------------------------------------------
-- 8. MÓDULO / PASO
-- HU: plataforma educativa dividida en módulos y pasos,
--     indicador de progreso, acceso directo a ejercicios
-- ------------------------------------------------------------
CREATE TABLE Modulo (
    id_modulo    INT(3)       NOT NULL AUTO_INCREMENT,
    titulo       VARCHAR(150) NOT NULL,
    descripcion  VARCHAR(300) NOT NULL,
    id_foro      INT(3)       NULL,
    id_paso      INT(3)       NULL,                  -- FK añadida tras CREATE Paso
    PRIMARY KEY (id_modulo)
);

CREATE TABLE Paso (
    id_paso            INT(3)       NOT NULL AUTO_INCREMENT,
    titulo             VARCHAR(150) NOT NULL,
    contenido_textual  VARCHAR(500) NOT NULL,
    video              VARCHAR(300) NULL,
    completado         BOOLEAN      NOT NULL DEFAULT FALSE,
    id_modulo          INT(3)       NOT NULL,
    PRIMARY KEY (id_paso),
    FOREIGN KEY (id_modulo) REFERENCES Modulo(id_modulo)
);

-- FK de Modulo → Paso
ALTER TABLE Modulo
    ADD CONSTRAINT fk_modulo_paso
    FOREIGN KEY (id_paso) REFERENCES Paso(id_paso);

-- ============================================================
-- ÍNDICES SUGERIDOS PARA SPRINT 1
-- ============================================================
CREATE INDEX idx_ejercicio_activo_usuario  ON Ejercicio_Activo(id_usuario);
CREATE INDEX idx_ejercicio_activo_estado   ON Ejercicio_Activo(estado);
CREATE INDEX idx_ejercicio_resuelto_usuario ON Ejercicio_Resuelto(id_usuario);
CREATE INDEX idx_usuario_carta_usuario     ON Usuario_Carta(id_usuario);
CREATE INDEX idx_paso_modulo               ON Paso(id_modulo);