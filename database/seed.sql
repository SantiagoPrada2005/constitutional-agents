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

-- Base documental inicial: Documentos raíz
INSERT OR IGNORE INTO documentos (id, agente_id, dominio, habilidad_id, nombre_archivo) VALUES
(1, 1, 'transversal', 1, '00_transversal/principios_fundamentales.md'),
(2, 1, 'transversal', 2, '00_transversal/derechos_y_garantias.md'),
(3, 1, 'transversal', 4, '00_transversal/participacion_ciudadana.md'),
(4, 1, 'constitucional', 5, '01_constitucional/estructura_estado.md'),
(5, 1, 'constitucional', 3, '01_constitucional/dogmatica_constitucional.md'),
(6, NULL, 'administrativo', 6, '02_administrativo/cpaca_ley_1437.md'),
(7, NULL, 'penal', 7, '03_penal/codigo_procesal_penal_ley_906.md'),
(8, NULL, 'laboral', 8, '04_laboral/codigo_sustantivo_trabajo_cst.md'),
(9, NULL, 'civil', 9, '05_civil_comercial/codigo_general_proceso_cgp.md');

-- Fragmentos de conocimiento (Chunks para RAG / FTS / Embeddings)
INSERT OR IGNORE INTO documento_chunks (id, documento_id, indice, vector_id, titulo_seccion, contenido) VALUES
-- Dominio Transversal (Constitución Título I - Doc 1)
(1, 1, 0, 'vec-art-1', 'Artículo 1: Estado Social de Derecho', 'Colombia es un Estado social de derecho, organizado en forma de República unitaria, descentralizada, con autonomía de sus entidades territoriales, democrática, participativa y pluralista, fundada en el respeto de la dignidad humana, en el trabajo y la solidaridad de las personas que la integran y en la prevalencia del interés general.'),
(2, 1, 1, 'vec-art-2', 'Artículo 2: Fines Esenciales del Estado', 'Son fines esenciales del Estado: servir a la comunidad, promover la prosperidad general y garantizar la efectividad de los principios, derechos y deberes consagrados en la Constitución; facilitar la participación de todos en las decisiones que los afectan y en la vida económica, política, administrativa y cultural de la Nación; defender la independencia nacional, mantener la integridad territorial y asegurar la convivencia pacífica y la vigencia de un orden justo.'),
(3, 1, 2, 'vec-art-4', 'Artículo 4: Supremacía Constitucional', 'La Constitución es norma de normas. En todo caso de incompatibilidad entre la Constitución y la ley u otra norma jurídica, se aplicarán las disposiciones constitucionales.'),
-- Dominio Transversal (Constitución Título II - Doc 2)
(4, 2, 0, 'vec-art-11', 'Artículo 11: Derecho a la Vida', 'El derecho a la vida es inviolable. No habrá pena de muerte.'),
(5, 2, 1, 'vec-art-13', 'Artículo 13: Derecho a la Igualdad', 'Todas las personas nacen libres e iguales ante la ley, recibirán la misma protección y trato de las autoridades y gozarán de los mismos derechos, libertades y oportunidades sin ninguna discriminación por razones de sexo, raza, origen nacional o familiar, lengua, religión, opinión política o filosófica.'),
(6, 2, 2, 'vec-art-23', 'Artículo 23: Derecho de Petición', 'Toda persona tiene derecho a presentar peticiones respetuosas a las autoridades por motivos de interés general o particular y a obtener pronta resolución.'),
(7, 2, 3, 'vec-art-86', 'Artículo 86: Acción de Tutela', 'Toda persona tendrá acción de tutela para reclamar ante los jueces, en todo momento y lugar, mediante un procedimiento preferente y sumario, por sí misma o por quien actúe a su nombre, la protección inmediata de sus derechos constitucionales fundamentales, cuando quiera que éstos resulten vulnerados o amenazados por la acción o la omisión de cualquier autoridad pública.'),
-- Dominio Transversal (Constitución Título IV - Doc 3)
(8, 3, 0, 'vec-art-103', 'Artículo 103: Mecanismos de Participación Ciudadana', 'Son mecanismos de participación del pueblo en ejercicio de su soberanía: el voto, el plebiscito, el referendo, la consulta popular, el cabildo abierto, la iniciativa popular y la revocatoria del mandato. La ley los reglamentará.'),
-- Dominio Constitucional Especializado (Doc 4 & 5)
(9, 4, 0, 'vec-const-est-113', 'Principio de Separación y Colaboración Funcional (Art. 113 C.P.)', 'El Estado colombiano fundamenta su operatividad en la división tripartita tradicional, atemperada por el principio de colaboración armónica. Esto faculta el funcionamiento de frenos y contrapesos (checks and balances), permitiendo el ejercicio excepcional de competencias asignadas ordinariamente a otra rama.'),
(10, 4, 1, 'vec-const-est-ramas', 'Ramas del Poder Público: Legislativa, Ejecutiva y Judicial', 'Rama Legislativa (Art. 114): Congreso bicameral (Senado y Cámara). Rama Ejecutiva (Art. 115): Presidente de la República, Ministerios y entidades descentralizadas. Rama Judicial (Art. 116 y 228): Cortes, Tribunales, Juzgados y Fiscalía General de la Nación.'),
(11, 5, 0, 'vec-const-dog-tutela', 'Acción de Tutela: Finalidad y Trámite Sumario (Art. 86 C.P.)', 'Amparo inmediato de derechos fundamentales ante vulneración o amenaza por autoridad pública o particulares. Puede ejercerla cualquier persona en todo momento mediante trámite preferente y sumario con fallo improrrogable en 10 días hábiles.'),
-- Dominio Administrativo (Doc 6)
(12, 6, 0, 'vec-admin-peticion', 'Derecho de Petición y Términos de Respuesta (Arts. 13-33 CPACA)', 'Toda persona tiene derecho a presentar peticiones respetuosas a las autoridades. Términos legales de respuesta: 15 días hábiles para peticiones de interés general o particular; 10 días hábiles para solicitudes de información y copias; 30 días hábiles para consultas jurídicas. El silencio administrativo negativo opera a los 3 meses sin respuesta.'),
(13, 6, 1, 'vec-admin-recursos', 'Vía Gubernativa y Recursos Ordinarios (Arts. 74-82 CPACA)', 'Contra los actos administrativos definitivos proceden el Recurso de Reposición (ante el mismo funcionario, facultativo) y el Recurso de Apelación (ante el superior jerárquico, obligatorio para agotar vía administrativa). Deben interponerse por escrito dentro de los 10 días hábiles siguientes a la notificación.'),
(14, 6, 2, 'vec-admin-medios-control', 'Medios de Control: Nulidad y Restablecimiento y Reparación Directa', 'Nulidad y Restablecimiento del Derecho (Art. 138 CPACA): amparo de derechos subjetivos con término de caducidad perentorio de 4 meses. Reparación Directa (Art. 140 CPACA): responsabilidad extracontractual por daño antijurídico del Estado con caducidad de 2 años.'),
-- Dominio Penal (Doc 7)
(15, 7, 0, 'vec-penal-principios', 'Principios Rectores del Sistema Penal Acusatorio (Arts. 1-27 CPP)', 'Dignidad humana, libertad personal, presunción de inocencia e in dubio pro reo. Toda persona se presume inocente hasta que se declare su culpabilidad en sentencia judicial ejecutoriada. El derecho a la defensa técnica es irrenunciable desde el momento de la captura o vinculación.'),
(16, 7, 1, 'vec-penal-captura', 'Régimen de Captura y Plazo de 36 Horas ante Juez de Garantías', 'La captura procede por orden judicial previa o en flagrancia. La persona capturada debe ser puesta a disposición del Juez de Control de Garantías en un término improrrogable de 36 horas para el control de legalidad de la aprehensión (Art. 302 CPP).'),
(17, 7, 2, 'vec-penal-aseguramiento', 'Medidas de Aseguramiento Cautelares y Fines Constitucionales', 'El juez puede imponer medida de aseguramiento privativa (cárcel o domiciliaria) o no privativa únicamente si resulta necesaria para evitar la obstrucción de la justicia, proteger a la comunidad o víctimas, o asegurar la comparecencia del imputado (Art. 308 CPP).'),
-- Dominio Laboral (Doc 8)
(18, 8, 0, 'vec-lab-elementos', 'Elementos Esenciales del Contrato de Trabajo y Presunción (Arts. 23-24 CST)', 'Se configura contrato de trabajo con: 1) Actividad personal, 2) Continuada subordinación o dependencia, y 3) Salario remuneratorio. El Art. 24 CST consagra la presunción de que toda relación de trabajo personal está regida por contrato de trabajo.'),
(19, 8, 1, 'vec-lab-despido', 'Despido Injustificado e Indemnizaciones Tarifadas (Art. 64 CST)', 'En contratos a término fijo se indemniza el valor de los salarios correspondientes al tiempo faltante. En contratos a término indefinido (para salarios menores a 10 SMLMV) se pagan 30 días de salario por el primer año y 20 días por cada año adicional.'),
(20, 8, 2, 'vec-lab-estabilidad', 'Estabilidad Laboral Reforzada: Fuero de Maternidad y Salud', 'Prohibición de despido discriminatorio: fuero de maternidad (Art. 239 CST, reintegro obligatorio) y fuero de salud (Ley 361 de 1997, Art. 26). El despido de un trabajador en debilidad manifiesta sin autorización del Ministerio del Trabajo es ineficaz y genera indemnización sancionatoria de 180 días de salario.'),
-- Dominio Civil y Comercial (Doc 9)
(21, 9, 0, 'vec-civ-competencia', 'Factores de Competencia Judicial: Cuantía y Territorio (Arts. 15-34 CGP)', 'Competencia por cuantía: Mínima cuantía hasta 40 SMLMV; Menor cuantía entre 40 y 150 SMLMV; Mayor cuantía superior a 150 SMLMV. Competencia territorial: regla general domicilio del demandado (forum domicilii); en inmuebles lugar de ubicación (forum rei sitae).'),
(22, 9, 1, 'vec-civ-pruebas', 'Régimen Probatorio y Carga Dinámica de la Prueba (Arts. 164-167 CGP)', 'Las decisiones deben basarse en pruebas válidamente aportadas. Incumbe a las partes probar los supuestos de hecho, pero el juez puede distribuir la carga probatoria exigiendo acreditar a la parte en mejor condición técnica o material.'),
(23, 9, 2, 'vec-civ-ejecutivo', 'Proceso Ejecutivo y Título Ejecutivo (Art. 422 CGP)', 'Procede la ejecución coactiva sobre obligaciones expresas, claras y actualmente exigibles que consten en documentos provenientes del deudor o de sentencia judicial. El mandamiento de pago otorga 5 días para pagar y 10 días para formular excepciones de mérito.');

