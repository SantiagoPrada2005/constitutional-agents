-- Catálogo Maestro de Habilidades
INSERT OR IGNORE INTO habilidades (codigo, nombre, descripcion) VALUES
('CONSTITUCIONAL', 'Derecho Constitucional General', 'Estructura dogmática y orgánica de la Carta Magna de 1991.'),
('DERECHOS_FUNDAMENTALES', 'Derechos Fundamentales', 'Especialidad en el Título II: derechos individuales, garantías procesales y libertades.'),
('TUTELA', 'Acción de Tutela', 'Procedencia, inmediatez y subsidiariedad del Artículo 86 constitucional.'),
('MECANISMOS_PARTICIPACION', 'Mecanismos de Participación Ciudadana', 'Plebiscito, referendo, consulta popular, cabildo abierto y revocatoria.');

-- Agente Constitucional Maestro
INSERT OR IGNORE INTO agentes (id, slug, nombre, rol, modelo, temperatura, system_prompt, activo) VALUES
(1, 'constitucional-co', 'ConstitucionalBot Colombia', 'Asesor Jurídico Constitucional Senior', '@cf/meta/llama-4-scout-17b-16e-instruct', 0.2, 'Eres un asesor legal constitucional especializado en la Constitución Política de Colombia de 1991. Tu objetivo es orientar a los ciudadanos y responder preguntas jurídicas con rigor técnico, citando siempre con exactitud los títulos, capítulos y artículos correspondientes según la evidencia documental provista.', 1);

-- Vinculación inicial de habilidades al agente maestro
INSERT OR IGNORE INTO agente_habilidades (agente_id, habilidad_id) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4);

-- Base documental inicial para RAG Constitucional
INSERT OR IGNORE INTO agente_documentos (id, agente_id, vector_id, nombre_archivo, titulo_seccion, contenido) VALUES
(1, 1, 'vec-art-1', 'titulo_1_principios.md', 'Artículo 1: Estado Social de Derecho', 'Colombia es un Estado social de derecho, organizado en forma de República unitaria, descentralizada, con autonomía de sus entidades territoriales, democrática, participativa y pluralista, fundada en el respeto de la dignidad humana, en el trabajo y la solidaridad de las personas que la integran y en la prevalencia del interés general.'),
(2, 1, 'vec-art-2', 'titulo_1_principios.md', 'Artículo 2: Fines Esenciales del Estado', 'Son fines esenciales del Estado: servir a la comunidad, promover la prosperidad general y garantizar la efectividad de los principios, derechos y deberes consagrados en la Constitución; facilitar la participación de todos en las decisiones que los afectan y en la vida económica, política, administrativa y cultural de la Nación; defender la independencia nacional, mantener la integridad territorial y asegurar la convivencia pacífica y la vigencia de un orden justo.'),
(3, 1, 'vec-art-4', 'titulo_1_principios.md', 'Artículo 4: Supremacía Constitucional', 'La Constitución es norma de normas. En todo caso de incompatibilidad entre la Constitución y la ley u otra norma jurídica, se aplicarán las disposiciones constitucionales.'),
(4, 1, 'vec-art-11', 'titulo_2_derechos.md', 'Artículo 11: Derecho a la Vida', 'El derecho a la vida es inviolable. No habrá pena de muerte.'),
(5, 1, 'vec-art-13', 'titulo_2_derechos.md', 'Artículo 13: Derecho a la Igualdad', 'Todas las personas nacen libres e iguales ante la ley, recibirán la misma protección y trato de las autoridades y gozarán de los mismos derechos, libertades y oportunidades sin ninguna discriminación por razones de sexo, raza, origen nacional o familiar, lengua, religión, opinión política o filosófica.'),
(6, 1, 'vec-art-23', 'titulo_2_derechos.md', 'Artículo 23: Derecho de Petición', 'Toda persona tiene derecho a presentar peticiones respetuosas a las autoridades por motivos de interés general o particular y a obtener pronta resolución.'),
(7, 1, 'vec-art-86', 'titulo_2_derechos.md', 'Artículo 86: Acción de Tutela', 'Toda persona tendrá acción de tutela para reclamar ante los jueces, en todo momento y lugar, mediante un procedimiento preferente y sumario, por sí misma o por quien actúe a su nombre, la protección inmediata de sus derechos constitucionales fundamentales, cuando quiera que éstos resulten vulnerados o amenazados por la acción o la omisión de cualquier autoridad pública.'),
(8, 1, 'vec-art-103', 'titulo_4_participacion.md', 'Artículo 103: Mecanismos de Participación Ciudadana', 'Son mecanismos de participación del pueblo en ejercicio de su soberanía: el voto, el plebiscito, el referendo, la consulta popular, el cabildo abierto, la iniciativa popular y la revocatoria del mandato. La ley los reglamentará.');

