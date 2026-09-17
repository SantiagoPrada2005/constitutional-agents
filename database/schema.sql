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

-- 4. Documentos de Conocimiento (Entidad Raíz / Archivos)
CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id INTEGER,
    dominio VARCHAR(50) NOT NULL DEFAULT 'transversal',
    habilidad_id INTEGER,
    nombre_archivo VARCHAR(150) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE CASCADE,
    FOREIGN KEY (habilidad_id) REFERENCES habilidades(id) ON DELETE SET NULL
);

-- Índices B-Tree para documentos
CREATE INDEX IF NOT EXISTS idx_documentos_agente_id ON documentos(agente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_dominio ON documentos(dominio);
CREATE INDEX IF NOT EXISTS idx_documentos_habilidad_id ON documentos(habilidad_id);

-- 5. Fragmentos de Documentos (Chunks para Embeddings y RAG)
CREATE TABLE IF NOT EXISTS documento_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id INTEGER NOT NULL,
    indice INTEGER NOT NULL DEFAULT 0,
    titulo_seccion VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    vector_id VARCHAR(64) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE
);

-- Índices B-Tree para chunks
CREATE INDEX IF NOT EXISTS idx_chunks_documento_id ON documento_chunks(documento_id);
CREATE INDEX IF NOT EXISTS idx_chunks_vector_id ON documento_chunks(vector_id);

-- 6. Tabla virtual para búsqueda léxica rápida (FTS5 con External Content Table)
CREATE VIRTUAL TABLE IF NOT EXISTS fts_documento_chunks USING fts5(
    titulo_seccion,
    contenido,
    content='documento_chunks',
    content_rowid='id'
);

-- 7. Triggers para sincronización automática (FTS5 External Content)
CREATE TRIGGER IF NOT EXISTS trg_chunks_insert AFTER INSERT ON documento_chunks BEGIN
    INSERT INTO fts_documento_chunks(rowid, titulo_seccion, contenido)
    VALUES (new.id, new.titulo_seccion, new.contenido);
END;

CREATE TRIGGER IF NOT EXISTS trg_chunks_delete AFTER DELETE ON documento_chunks BEGIN
    INSERT INTO fts_documento_chunks(fts_documento_chunks, rowid, titulo_seccion, contenido)
    VALUES ('delete', old.id, old.titulo_seccion, old.contenido);
END;

CREATE TRIGGER IF NOT EXISTS trg_chunks_update AFTER UPDATE ON documento_chunks BEGIN
    INSERT INTO fts_documento_chunks(fts_documento_chunks, rowid, titulo_seccion, contenido)
    VALUES ('delete', old.id, old.titulo_seccion, old.contenido);
    INSERT INTO fts_documento_chunks(rowid, titulo_seccion, contenido)
    VALUES (new.id, new.titulo_seccion, new.contenido);
END;
