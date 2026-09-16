-- 0. Habilitar integridad referencial en SQLite
PRAGMA foreign_keys = ON;

-- 1. Tabla de Agentes (Entidad Principal)
CREATE TABLE IF NOT EXISTS agentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(60) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(100) NOT NULL,
    modelo VARCHAR(80) NOT NULL DEFAULT '@cf/meta/llama-4-scout-17b-16e-instruct',
    temperatura REAL NOT NULL DEFAULT 0.2,
    system_prompt TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogo de Habilidades disponibles
CREATE TABLE IF NOT EXISTS habilidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- 3. Tabla intermedia (Relación N:M Agente <-> Habilidades)
CREATE TABLE IF NOT EXISTS agente_habilidades (
    agente_id INTEGER NOT NULL,
    habilidad_id INTEGER NOT NULL,
    PRIMARY KEY (agente_id, habilidad_id),
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE CASCADE,
    FOREIGN KEY (habilidad_id) REFERENCES habilidades(id) ON DELETE CASCADE
);

-- 4. Documentos y Chunks de Conocimiento (.md) asignados a cada Agente
CREATE TABLE IF NOT EXISTS agente_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id INTEGER NOT NULL,
    vector_id VARCHAR(64),
    nombre_archivo VARCHAR(150) NOT NULL,
    titulo_seccion VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE CASCADE
);

-- 5. Tabla virtual para búsqueda léxica rápida (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS fts_documentos USING fts5(
    documento_id UNINDEXED,
    agente_id UNINDEXED,
    titulo_seccion,
    contenido
);

-- 6. Triggers para sincronización automática entre agente_documentos y fts_documentos
CREATE TRIGGER IF NOT EXISTS trg_documentos_insert AFTER INSERT ON agente_documentos BEGIN
    INSERT INTO fts_documentos (documento_id, agente_id, titulo_seccion, contenido)
    VALUES (new.id, new.agente_id, new.titulo_seccion, new.contenido);
END;

CREATE TRIGGER IF NOT EXISTS trg_documentos_delete AFTER DELETE ON agente_documentos BEGIN
    DELETE FROM fts_documentos WHERE documento_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_documentos_update AFTER UPDATE ON agente_documentos BEGIN
    UPDATE fts_documentos
    SET titulo_seccion = new.titulo_seccion, contenido = new.contenido
    WHERE documento_id = old.id;
END;
