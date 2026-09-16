-- Catálogo Maestro de Habilidades por Especialidad y Dominio
INSERT OR IGNORE INTO habilidades (id, codigo, nombre, descripcion) VALUES
(1, 'CONSTITUCIONAL', 'Derecho Constitucional General', 'Estructura dogmática y orgánica de la Carta Magna de 1991.'),
(2, 'DERECHOS_FUNDAMENTALES', 'Derechos Fundamentales', 'Especialidad en el Título II: derechos individuales, garantías procesales y libertades.'),
(3, 'TUTELA', 'Acción de Tutela', 'Procedencia, inmediatez y subsidiariedad del Artículo 86 constitucional.'),
(4, 'MECANISMOS_PARTICIPACION', 'Mecanismos de Participación Ciudadana', 'Plebiscito, referendo, consulta popular, cabildo abierto y revocatoria.'),
(5, 'ESTRUCTURA_ESTADO', 'Estructura y Ramas del Estado', 'Ramas del poder público, órganos autónomos y organismos de control.'),
(6, 'ADMINISTRATIVO', 'Derecho Administrativo y Contencioso', 'Procedimiento administrativo, CPACA y litigio público.'),
(7, 'PENAL', 'Derecho Penal y Procesal Penal', 'Sistema acusatorio penal, Ley 906 y garantías procesales.'),
(8, 'LABORAL', 'Derecho Laboral y Seguridad Social', 'Código procesal laboral, seguridad social y pensiones.'),
(9, 'CIVIL', 'Derecho Civil y Procesal General', 'Código General del Proceso y derecho privado.');

-- Agente 1: Asesor Constitucional Especialista
INSERT OR IGNORE INTO agentes (id, slug, nombre, rol, modelo, temperatura, system_prompt, activo) VALUES
(1, 'constitucional-co', 'ConstitucionalBot Colombia', 'Asesor Jurídico Constitucional Senior', '@cf/meta/llama-4-scout-17b-16e-instruct', 0.2, 'Eres un asesor legal constitucional especializado en la Constitución Política de Colombia de 1991. Tu objetivo es orientar a los ciudadanos y responder preguntas jurídicas con rigor técnico, citando siempre con exactitud los títulos, capítulos y artículos correspondientes según la evidencia documental provista.', 1);

-- Agente 2: Asesor Jurídico General (Multi-Dominio)
INSERT OR IGNORE INTO agentes (id, slug, nombre, rol, modelo, temperatura, system_prompt, activo) VALUES
(2, 'juridico-general', 'LexGeneral Colombia', 'Asesor Jurídico General Multidisciplinario', '@cf/meta/llama-4-scout-17b-16e-instruct', 0.25, 'Eres un consultor jurídico integral con visión transversal de todas las ramas del derecho colombiano. Tu objetivo es orientar y canalizar consultas legales analizando normas constitucionales, administrativas, penales, laborales y procesales según corresponda al caso.', 1);

-- Vinculación de habilidades al Agente Constitucional Especialista
INSERT OR IGNORE INTO agente_habilidades (agente_id, habilidad_id) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5);

-- Vinculación de todas las habilidades al Agente General
INSERT OR IGNORE INTO agente_habilidades (agente_id, habilidad_id) VALUES
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9);

-- Base documental inicial vinculada por Dominio y Habilidad
INSERT OR IGNORE INTO agente_documentos (id, agente_id, dominio, habilidad_id, vector_id, nombre_archivo, titulo_seccion, contenido) VALUES
-- Dominio Transversal (Constitución Título I)
(1, 1, 'transversal', 1, 'vec-art-1', '00_transversal/principios_fundamentales.md', 'Artículo 1: Estado Social de Derecho', 'Colombia es un Estado social de derecho, organizado en forma de República unitaria, descentralizada, con autonomía de sus entidades territoriales, democrática, participativa y pluralista, fundada en el respeto de la dignidad humana, en el trabajo y la solidaridad de las personas que la integran y en la prevalencia del interés general.'),
(2, 1, 'transversal', 1, 'vec-art-2', '00_transversal/principios_fundamentales.md', 'Artículo 2: Fines Esenciales del Estado', 'Son fines esenciales del Estado: servir a la comunidad, promover la prosperidad general y garantizar la efectividad de los principios, derechos y deberes consagrados en la Constitución; facilitar la participación de todos en las decisiones que los afectan y en la vida económica, política, administrativa y cultural de la Nación; defender la independencia nacional, mantener la integridad territorial y asegurar la convivencia pacífica y la vigencia de un orden justo.'),
(3, 1, 'transversal', 1, 'vec-art-4', '00_transversal/principios_fundamentales.md', 'Artículo 4: Supremacía Constitucional', 'La Constitución es norma de normas. En todo caso de incompatibilidad entre la Constitución y la ley u otra norma jurídica, se aplicarán las disposiciones constitucionales.'),
-- Dominio Transversal (Constitución Título II)
(4, 1, 'transversal', 2, 'vec-art-11', '00_transversal/derechos_y_garantias.md', 'Artículo 11: Derecho a la Vida', 'El derecho a la vida es inviolable. No habrá pena de muerte.'),
(5, 1, 'transversal', 2, 'vec-art-13', '00_transversal/derechos_y_garantias.md', 'Artículo 13: Derecho a la Igualdad', 'Todas las personas nacen libres e iguales ante la ley, recibirán la misma protección y trato de las autoridades y gozarán de los mismos derechos, libertades y oportunidades sin ninguna discriminación por razones de sexo, raza, origen nacional o familiar, lengua, religión, opinión política o filosófica.'),
(6, 1, 'transversal', 2, 'vec-art-23', '00_transversal/derechos_y_garantias.md', 'Artículo 23: Derecho de Petición', 'Toda persona tiene derecho a presentar peticiones respetuosas a las autoridades por motivos de interés general o particular y a obtener pronta resolución.'),
(7, 1, 'transversal', 3, 'vec-art-86', '00_transversal/derechos_y_garantias.md', 'Artículo 86: Acción de Tutela', 'Toda persona tendrá acción de tutela para reclamar ante los jueces, en todo momento y lugar, mediante un procedimiento preferente y sumario, por sí misma o por quien actúe a su nombre, la protección inmediata de sus derechos constitucionales fundamentales, cuando quiera que éstos resulten vulnerados o amenazados por la acción o la omisión de cualquier autoridad pública.'),
-- Dominio Transversal (Constitución Título IV)
(8, 1, 'transversal', 4, 'vec-art-103', '00_transversal/participacion_ciudadana.md', 'Artículo 103: Mecanismos de Participación Ciudadana', 'Son mecanismos de participación del pueblo en ejercicio de su soberanía: el voto, el plebiscito, el referendo, la consulta popular, el cabildo abierto, la iniciativa popular y la revocatoria del mandato. La ley los reglamentará.'),
-- Dominio Constitucional Especializado (Dogmática y Estructura)
(9, 1, 'constitucional', 5, 'vec-const-est-113', '01_constitucional/estructura_estado.md', 'Principio de Separación y Colaboración Funcional (Art. 113 C.P.)', 'El Estado colombiano fundamenta su operatividad en la división tripartita tradicional, atemperada por el principio de colaboración armónica. Esto faculta el funcionamiento de frenos y contrapesos (checks and balances), permitiendo el ejercicio excepcional de competencias asignadas ordinariamente a otra rama.'),
(10, 1, 'constitucional', 5, 'vec-const-est-ramas', '01_constitucional/estructura_estado.md', 'Ramas del Poder Público: Legislativa, Ejecutiva y Judicial', 'Rama Legislativa (Art. 114): Congreso bicameral (Senado y Cámara). Rama Ejecutiva (Art. 115): Presidente de la República, Ministerios y entidades descentralizadas. Rama Judicial (Art. 116 y 228): Cortes, Tribunales, Juzgados y Fiscalía General de la Nación.'),
(11, 1, 'constitucional', 3, 'vec-const-dog-tutela', '01_constitucional/dogmatica_constitucional.md', 'Acción de Tutela: Finalidad y Trámite Sumario (Art. 86 C.P.)', 'Amparo inmediato de derechos fundamentales ante vulneración o amenaza por autoridad pública o particulares. Puede ejercerla cualquier persona en todo momento mediante trámite preferente y sumario con fallo improrrogable en 10 días hábiles.');

