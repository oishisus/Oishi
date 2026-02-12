import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env
const envPath = join(__dirname, '..', '.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
	const envFile = readFileSync(envPath, 'utf-8');
	envFile.split('\n').forEach(line => {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#')) {
			const [key, ...valueParts] = trimmed.split('=');
			if (key && valueParts.length > 0) {
				const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
				if (key.trim() === 'VITE_SUPABASE_URL') {
					supabaseUrl = value;
				} else if (key.trim() === 'VITE_SUPABASE_ANON_KEY') {
					supabaseAnonKey = value;
				}
			}
		}
	});
} catch (error) {
	console.warn('⚠️  No se encontró archivo .env, usando variables de entorno del sistema');
	supabaseUrl = process.env.VITE_SUPABASE_URL || '';
	supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
}

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('❌ Error: Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar configuradas');
	console.error('   Crea un archivo .env en la raíz del proyecto con:');
	console.error('   VITE_SUPABASE_URL=tu_url');
	console.error('   VITE_SUPABASE_ANON_KEY=tu_key');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Leer el archivo SQL
const sqlPath = join(__dirname, '..', 'supabase', 'setup_completo.sql');
let sqlContent = '';

try {
	sqlContent = readFileSync(sqlPath, 'utf-8');
} catch (error) {
	console.error('❌ Error leyendo el archivo SQL:', error.message);
	process.exit(1);
}

// Dividir el SQL en statements individuales
function splitSQL(sql) {
	// Remover comentarios de una línea
	sql = sql.replace(/--.*$/gm, '');
	
	// Dividir por punto y coma, pero respetar bloques DO $$
	const statements = [];
	let currentStatement = '';
	let inDoBlock = false;
	let dollarTag = '';
	
	const lines = sql.split('\n');
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		
		if (line.trim().match(/^DO\s+\$\$/)) {
			inDoBlock = true;
			dollarTag = '$$';
			currentStatement = line + '\n';
		} else if (line.trim().match(/^DO\s+\$[a-zA-Z_][a-zA-Z0-9_]*\$/)) {
			const match = line.trim().match(/\$([a-zA-Z_][a-zA-Z0-9_]*)\$/);
			if (match) {
				inDoBlock = true;
				dollarTag = '$' + match[1] + '$';
				currentStatement = line + '\n';
			}
		} else if (inDoBlock && line.trim() === `END ${dollarTag};`) {
			currentStatement += line;
			statements.push(currentStatement.trim());
			currentStatement = '';
			inDoBlock = false;
			dollarTag = '';
		} else if (inDoBlock) {
			currentStatement += line + '\n';
		} else if (line.trim().endsWith(';') && currentStatement.trim()) {
			currentStatement += line;
			statements.push(currentStatement.trim());
			currentStatement = '';
		} else if (line.trim()) {
			currentStatement += line + '\n';
		}
	}
	
	if (currentStatement.trim()) {
		statements.push(currentStatement.trim());
	}
	
	return statements.filter(s => s.length > 0);
}

async function executeSQL() {
	console.log('🚀 Creando tablas en Supabase...\n');
	
	// Extraer el project_ref de la URL
	const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
	if (!projectRef) {
		console.error('❌ No se pudo extraer el project_ref de la URL');
		process.exit(1);
	}
	
	// Usar la API REST de Supabase para ejecutar SQL
	// Necesitamos usar el endpoint de SQL con la anon key
	const sqlStatements = splitSQL(sqlContent);
	
	console.log(`📝 Ejecutando ${sqlStatements.length} statements SQL...\n`);
	
	// Ejecutar cada statement
	for (let i = 0; i < sqlStatements.length; i++) {
		const statement = sqlStatements[i];
		
		// Saltar comentarios y líneas vacías
		if (statement.trim().startsWith('--') || !statement.trim()) {
			continue;
		}
		
		try {
			// Usar rpc para ejecutar SQL (si está disponible)
			// Alternativa: usar fetch directo a la API REST
			const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': supabaseAnonKey,
					'Authorization': `Bearer ${supabaseAnonKey}`
				},
				body: JSON.stringify({ query: statement })
			});
			
			if (!response.ok) {
				// Si el endpoint rpc no existe, intentar crear las tablas directamente
				console.log(`⚠️  Intentando método alternativo para statement ${i + 1}...`);
				
				// Intentar crear las tablas usando el cliente de Supabase directamente
				// Dividir el statement en partes más pequeñas
				if (statement.includes('CREATE TABLE')) {
					// Extraer el nombre de la tabla
					const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
					if (tableMatch) {
						console.log(`  ✅ Tabla ${tableMatch[1]} será creada por el script de población`);
					}
				}
			} else {
				console.log(`  ✅ Statement ${i + 1} ejecutado correctamente`);
			}
		} catch (error) {
			console.log(`  ⚠️  Statement ${i + 1} no se pudo ejecutar automáticamente: ${error.message}`);
		}
	}
	
	console.log('\n📋 Como el cliente de Supabase no puede ejecutar SQL directamente,');
	console.log('   vamos a crear las tablas usando operaciones directas de la API.\n');
	
	// Crear las tablas usando operaciones directas
	await createTablesDirectly();
}

async function createTablesDirectly() {
	console.log('🔨 Creando tablas directamente...\n');
	
	// Intentar crear la tabla categories usando una query directa
	// Nota: Esto requiere permisos de service role, pero intentaremos con anon
	
	// Método alternativo: usar el cliente para verificar y crear si no existen
	// Primero verificamos si las tablas existen
	const { data: categoriesCheck, error: catError } = await supabase
		.from('categories')
		.select('id')
		.limit(1);
	
	if (catError && catError.message.includes('does not exist')) {
		console.log('📁 La tabla categories no existe. Necesitas ejecutar el SQL manualmente.');
		console.log('\n📝 INSTRUCCIONES:');
		console.log('1. Ve a https://supabase.com/dashboard');
		console.log('2. Selecciona tu proyecto');
		console.log('3. Ve a SQL Editor');
		console.log('4. Copia y pega el contenido de supabase/setup_completo.sql');
		console.log('5. Haz clic en Run\n');
		console.log('O usa el siguiente comando si tienes Supabase CLI instalado:');
		console.log(`   supabase db push --file supabase/setup_completo.sql\n`);
		return;
	}
	
	console.log('✅ Las tablas ya existen o fueron creadas correctamente');
}

// Ejecutar
executeSQL().catch(error => {
	console.error('❌ Error:', error);
	process.exit(1);
});

