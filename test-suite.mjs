// Automated Verification Script for Constitutional AI Agent Orchestrator

const BASE_URL = 'http://localhost:4321';

async function runTests() {
  console.log('====================================================');
  console.log(' EJECUTANDO BATERÍA DE PRUEBAS DE LA RÚBRICA');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // PRUEBA 1: Consultar agentes (GET /api/agentes)
  try {
    console.log('▸ PRUEBA 1: Consultar agentes vía GET /api/agentes...');
    const res = await fetch(`${BASE_URL}/api/agentes`);
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data) && data.length > 0) {
      console.log(`  ✓ ÉXITO [HTTP 200]: Se recuperaron ${data.length} agentes.`);
      console.log(`    Agente inicial: "${data[0].nombre}" (slug: ${data[0].slug})`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: Código inesperado ${res.status}`, data);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ ERROR en Prueba 1:', err.message);
    failed++;
  }

  // PRUEBA 2: Registro correcto (POST /api/agentes)
  const testSlug = `agente-test-${Date.now()}`;
  try {
    console.log('\n▸ PRUEBA 2: Registro de nuevo agente con payload válido...');
    const res = await fetch(`${BASE_URL}/api/agentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: testSlug,
        nombre: 'Agente Garante de Tutelas Test',
        rol: 'Especialista en Acción de Tutela (Art. 86)',
        modelo: '@cf/meta/llama-4-scout-17b-16e-instruct',
        temperatura: 0.15,
        systemPrompt: 'Eres un especialista en la tramitación preferente de la acción de tutela en Colombia.',
        habilidades: ['CONSTITUCIONAL', 'TUTELA', 'DERECHOS_FUNDAMENTALES']
      })
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.id) {
      console.log(`  ✓ ÉXITO [HTTP 201 Created]: Agente creado con ID ${data.id}.`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: Código inesperado ${res.status}`, data);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ ERROR en Prueba 2:', err.message);
    failed++;
  }

  // PRUEBA 3: Validación de campos obligatorios (POST /api/agentes)
  try {
    console.log('\n▸ PRUEBA 3: Validación de campos (enviar payload incompleto)...');
    const res = await fetch(`${BASE_URL}/api/agentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Incompleto'
      })
    });
    const data = await res.json();
    if (res.status === 400 && !data.success) {
      console.log(`  ✓ ÉXITO [HTTP 400 Bad Request]: Se rechazó correctamente la petición incompleta.`);
      console.log(`    Mensaje: "${data.message}"`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: Debería haber devuelto 400, devolvió ${res.status}`, data);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ ERROR en Prueba 3:', err.message);
    failed++;
  }

  // PRUEBA 4: Restricción de duplicados (POST /api/agentes)
  try {
    console.log('\n▸ PRUEBA 4: Restricción de duplicados (intentar registrar slug existente)...');
    const res = await fetch(`${BASE_URL}/api/agentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: testSlug, // Reutilizar el mismo slug recién creado
        nombre: 'Agente Duplicado Intent',
        rol: 'Rol duplicado',
        systemPrompt: 'Prompt de prueba para validar restricción de duplicados.',
        habilidades: ['CONSTITUCIONAL']
      })
    });
    const data = await res.json();
    if (res.status === 409 && !data.success) {
      console.log(`  ✓ ÉXITO [HTTP 409 Conflict]: Se rechazó el slug duplicado "${testSlug}".`);
      console.log(`    Mensaje: "${data.message}"`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: Debería haber devuelto 409, devolvió ${res.status}`, data);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ ERROR en Prueba 4:', err.message);
    failed++;
  }

  // PRUEBA 5: Consulta RAG con .md (POST /api/agentes/1/consultar)
  try {
    console.log('\n▸ PRUEBA 5: Consulta RAG fundamentada en artículos .md...');
    const res = await fetch(`${BASE_URL}/api/agentes/1/consultar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pregunta: '¿Qué dispone la Constitución sobre el derecho a la vida y la pena de muerte?',
        stream: false
      })
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.citas && data.citas.length > 0) {
      console.log(`  ✓ ÉXITO [HTTP 200 OK]: El agente respondió fundamentando en citas normativas.`);
      console.log(`    Citas recuperadas: ${data.citas.length} fragmento(s).`);
      console.log(`    Primer artículo citado: "${data.citas[0].titulo}"`);
      console.log(`    Extracto de respuesta: "${data.respuesta.substring(0, 140)}..."`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: No devolvió citas o falló status ${res.status}`, data);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ ERROR en Prueba 5:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(` RESULTADO FINAL: ${passed} PASADAS / ${failed} FALLIDAS`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
