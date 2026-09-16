# Repositorio Maestro de Conocimiento Jurídico

**Identificador**: `conocimiento`  
**Ámbito**: Derecho Colombiano / Marco Legal y Dogmática Jurídica  
**Gobernanza**: Arquitectura Serverless RAG (D1 + Vectorize + Workers AI)

## 1. Misión y Enfoque Operativo
Este repositorio centraliza las fuentes normativas, dogmáticas y jurisprudenciales del ordenamiento jurídico colombiano para alimentar el sistema RAG de Agentes de IA. Respeta el principio de veracidad fidedigna:
- Citación exacta de artículos y normas vigentes.
- Identificación de jerarquías normativas y acciones constitucionales.
- Articulación procesal directa entre la parte sustantiva y las vías judiciales.

## 2. Estructura Taxonómica

| Carpeta | Área Jurídica / Especialidad | Fuentes Clave |
| :--- | :--- | :--- |
| `00_transversal/` | Normas Fundamentales Compartidas | Constitución Política 1991 (Principios, Derechos, Participación) |
| `01_constitucional/` | Derecho Constitucional y Estructura Estatal | Dogmática de Derechos, Estructura del Estado, Fuentes Constitucionales |
| `02_administrativo/` | Procedimiento Administrativo y Contencioso | Ley 1437 de 2011 (CPACA), Medidas Cautelares |
| `03_penal/` | Derecho Penal y Sistema Acusatorio | Ley 906 de 2004 (CPP), Garantías Procesales |
| `04_laboral/` | Derecho del Trabajo y Seguridad Social | CPTSS, Régimen Pensional, Estabilidad Reforzada |
| `05_civil_comercial/` | Derecho Privado y Procedimiento Unificado | Ley 1564 de 2012 (Código General del Proceso - CGP) |

## 3. Convención de Segmentación (Chunking RAG)
Para garantizar la precisión en el motor RAG de Cloudflare:
- Cada documento inicia con un encabezado `#` con su título maestro.
- Cada sección indivisible de conocimiento (artículo, acción jurídica o institución) se delimita con encabezado `##`.
