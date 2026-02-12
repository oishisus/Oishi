import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env
const envPath = join(__dirname, '..', '.env');
try {
	const envFile = readFileSync(envPath, 'utf-8');
	envFile.split('\n').forEach(line => {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length > 0) {
			const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
			process.env[key.trim()] = value;
		}
	});
} catch (error) {
	console.warn('⚠️  No se encontró archivo .env, usando variables de entorno del sistema');
}

// Cargar variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('❌ Error: Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar configuradas en .env');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Datos de categorías
const categories = [
	{ name: 'GOHAN', order: 1 },
	{ name: 'CEVICHES Y PLATOS FRÍOS OISHI', order: 2 },
	{ name: 'PLATOS CALIENTES ESPECIALES', order: 3 },
	{ name: 'ENTRADAS CALIENTES', order: 4 },
	{ name: 'SASHIMI', order: 5 },
	{ name: 'ROLLS CALIFORNIA', order: 6 },
	{ name: 'ROLLS TRADICIONALES', order: 7 },
	{ name: 'ROLLS DE LA CASA OISHI', order: 8 },
	{ name: 'HOT ROLLS', order: 9 },
	{ name: 'HOT ROLLS ESPECIALES OISHI', order: 10 },
	{ name: 'ROLLS SIN ARROZ', order: 11 },
	{ name: 'HOT VEGETARIANOS', order: 12 },
	{ name: 'ROLLS VEGETARIANOS', order: 13 },
	{ name: 'PROMOCIONES', order: 14 }
];

// Datos de productos organizados por categoría
const productsByCategory = {
	'GOHAN': [
		{ name: 'Gohan de Pollo', description: 'Bowl con base de arroz, palta, cebollín y queso crema con pollo', price: 6000 },
		{ name: 'Gohan de Camarones', description: 'Bowl con base de arroz, palta, cebollín y queso crema con camarones', price: 6500 },
		{ name: 'Gohan de Salmón', description: 'Bowl con base de arroz, palta, cebollín y queso crema con salmón', price: 7000 },
		{ name: 'Gohan de Salmón Camarones', description: 'Bowl con base de arroz, palta, cebollín y queso crema con salmón y camarones', price: 7500 },
		{ name: 'Gohan Salmón Pollo', description: 'Bowl con base de arroz, palta, cebollín y queso crema con salmón y pollo', price: 7500 },
		{ name: 'Gohan Acevichado', description: 'Bowl con base de arroz, palta, cebollín y queso crema con proteína acevichada', price: 8000 },
		{ name: 'Gohan de Vegetales', description: 'Bowl con base de arroz, palta, cebollín y queso crema con vegetales', price: 6000 }
	],
	'CEVICHES Y PLATOS FRÍOS OISHI': [
		{ name: 'Ceviche de Reineta', description: 'Reineta fresca, cebolla, leche de tigre, limón, camote cocido, canchita choclo peruano y cilantro', price: 10000 },
		{ name: 'Ceviche Mixto', description: 'Finos cortes de reineta, salmón y camarón, leche tigre, limón, camote cocido canchita, choclo peruano y cilantro', price: 10500 },
		{ name: 'Ceviche de Salmón', description: 'Finos cortes de salmón, cebolla, leche de tigre, limón, camote cocido, canchita choclo peruano y cilantro', price: 10500 },
		{ name: 'Ceviche de Ají Amarillo', description: 'Finos cortes de reineta y camarón en salsa acevichada con un toque de salsa de ají amarillo, palta y cilantro', price: 10000 },
		{ name: 'Ceviche de Champiñón', description: 'Champiñones frescos, pimentón, cebolla, leche tigre, limón, camote cocido palta y cilantro', price: 8000 },
		{ name: 'Palta Acevichada', description: 'Cuadritos de palta, pimentón, coronada con ceviche de reineta salsa de ají amarillo y un toque de masago', price: 12000 },
		{ name: 'Tiraditos de Salmón', description: '12 finos cortes de salmón bañados en salsa especial oishi con un toque de salsa spice', price: 12500 },
		{ name: 'Tiraditos de Atún', description: '12 finos cortes de atún con palta, bañado en salsa especial oishi con un toque de togarashi y cilantro', price: 12000 }
	],
	'PLATOS CALIENTES ESPECIALES': [
		{ name: 'Lomo Salteado', description: 'Lomo salteado con vegetales estilo peruano acompañado de arroz y papas fritas', price: 12500 },
		{ name: 'Tallarines a la Huancaína con Pollo', description: 'Tallarines en salsa huancaína acompañado de pollo', price: 9000 },
		{ name: 'Tallarines a la Huancaína con Lomo', description: 'Tallarines en salsa huancaína acompañado de lomo', price: 11500 },
		{ name: 'Tallarines a la Huancaína con Marisco', description: 'Tallarines en salsa huancaína acompañado de marisco', price: 11000 },
		{ name: 'Arroz con Mariscos', description: 'Arroz con mariscos aderezado con exquisita salsa de ají amarillo, coronado con ensalada criolla', price: 11000 },
		{ name: 'Tepanyaki', description: 'Arroz frito estilo tailandés acompañado con cebolla y champiñones con la proteína de tu elección a la plancha', price: 7000 },
		{ name: 'Pollo Takiri', description: 'Pollo salteado con champiñones, arroz y ensalada fresca', price: 8000 },
		{ name: 'Pescado Blanco', description: 'Pescado blanco en salsa blanca con champiñones acompañado con arroz o papa salteada', price: 10500 },
		{ name: 'Tataki de Atún', description: 'Atún sellado con pimienta y aceite de sésamo acompañado de arroz y verduras salteadas', price: 10500 },
		{ name: 'Salmón al Grill', description: 'Salmón bañado con pebre y con un toque de salsa ají amarillo acompañado con arroz o papas', price: 12500 }
	],
	'ENTRADAS CALIENTES': [
		{ name: 'Gyozas Pollo o Cerdo', description: '5 unidades de gyozas de pollo o cerdo', price: 3800 },
		{ name: 'Gyozas Camarón', description: '5 unidades de gyozas de camarón', price: 4000 },
		{ name: 'Ebi Cheese', description: '5 camarones, queso crema apanados y salsa tártara', price: 4500 },
		{ name: 'Ebi Furay', description: '5 camarones apanados con salsa tártara', price: 4000 },
		{ name: 'Champi Cheese', description: '5 champiñones rellenos de queso crema y verduras', price: 4500 },
		{ name: 'Croquetas de Salmón', description: '5 unidades con salsa tártara', price: 4500 },
		{ name: 'Ebi Balls', description: '5 bolitas de camarón, queso crema apanado y salsa funji', price: 5000 },
		{ name: 'Arrollado Primavera', description: '5 unidades con salsa soya o teriyaki', price: 3500 },
		{ name: 'Arrollado Jamón Queso', description: '5 unidades con salsa soya o teriyaki', price: 3500 },
		{ name: 'Wakame', description: 'Frescas algas aderezadas', price: 4000 },
		{ name: 'Ensalada Dinamita', description: 'Wakame y kanikama con salsa acevichada', price: 5000 },
		{ name: 'Pollo Kids', description: 'Trocitos de pollo apanado', price: 4000 }
	],
	'SASHIMI': [
		{ name: 'Sashimi 3 Cortes', description: '3 cortes de salmón, atún o mixto', price: 4000 },
		{ name: 'Sashimi 6 Cortes', description: '6 cortes de salmón, atún o mixto', price: 7000 },
		{ name: 'Sashimi 9 Cortes', description: '9 cortes de salmón, atún o mixto', price: 9500 }
	],
	'ROLLS CALIFORNIA': [
		{ name: 'California Roll', description: 'Kanikama, pepino, palta en masago', price: 5000 },
		{ name: 'Alaska Rolls', description: 'Salmón, queso crema, palta en sésamo', price: 5500 },
		{ name: 'Ebi California', description: 'Camarón apanado, queso crema y cebollín', price: 5000 },
		{ name: 'Chicken California', description: 'Pollo apanado, queso crema, kanikama apanado', price: 5000 },
		{ name: 'Tery California', description: 'Pollo teriyaki, queso y pimentón', price: 5500 },
		{ name: 'Tuna California', description: 'Atún, queso y pepino', price: 5000 },
		{ name: 'Ebi Fresh', description: 'Camarón, queso crema y palta', price: 5000 },
		{ name: 'Mango California', description: 'Mango, queso crema, kanikama apanado', price: 5000 }
	],
	'ROLLS TRADICIONALES': [
		{ name: 'Avocado de Salmón', description: 'Salmón, queso crema en palta', price: 6500 },
		{ name: 'Avocado de camarón', description: 'Camarón, queso crema, cebollín en palta', price: 6200 },
		{ name: 'Ebi roll', description: 'Camarón, queso crema, palta en sésamo', price: 6500 },
		{ name: 'Maguro roll', description: 'Atún, palta en queso crema', price: 6000 },
		{ name: 'Chicken tery', description: 'Pollo teriyaki, queso crema y cebollín en palta', price: 5800 },
		{ name: 'Chicken krispy', description: 'Pollo apanado, queso crema, cebollín en palta', price: 6000 },
		{ name: 'Zetsu', description: 'Pollo apanado, palta, cebollín en queso crema', price: 6500 },
		{ name: 'Ebi sake roll', description: 'Salmón, camarón apanado, cebollín en palta', price: 6500 },
		{ name: 'Ebi exotic', description: 'Camarón, queso crema, mango en salmón', price: 6500 },
		{ name: 'Ebi cheese', description: 'Camarón apanado, palta en queso crema flameado y salsa tery', price: 5900 },
		{ name: 'Ichiro roll', description: 'Salmón, palta, cebollín en atún, y salsa acevichada', price: 6000 },
		{ name: 'Kilua', description: 'Pollo apanado, palta, cebollín en queso crema', price: 6000 }
	],
	'ROLLS DE LA CASA OISHI': [
		{ name: 'Fuji roll', description: 'Camarones apanado, queso crema, con topping de camarones en tempura y exquisita salsa fuji', price: 7000 },
		{ name: 'Ebi avocado', description: 'Salmón, camarón, queso crema en palta', price: 7500 },
		{ name: 'Alaska fresh', description: 'Salmón, queso crema, mango en palta y salmón', price: 8000 },
		{ name: 'Maracuyá roll', description: 'Salmón tempura, palta y tempura crispy en queso y salsa de maracuyá', price: 8000 },
		{ name: 'Smook cheese', description: 'Camarón apanado, palta y cebollín en queso crema flameado con chimichurri y salsa tery', price: 6500 },
		{ name: 'Lemon roll', description: 'Salmón tempura, queso crema, palta, palta en salmón y rodajas de limón con salsa tery', price: 7000 },
		{ name: 'Rainbow roll', description: 'Salmón, atún, queso crema y mango en plaqueta mixta de pescados, mango y palta', price: 7000 },
		{ name: 'Uzumaki roll', description: 'Salmón ahumado, queso crema y kanikama apanado en plátano con puntos de salsa dinamita y salsa tery', price: 7000 },
		{ name: 'Futo rainbow', description: 'Salmón, atún, queso crema y mango en nori, salsa acevichada y toques de masago', price: 8000 },
		{ name: 'Selva green', description: 'Camarón tempura, palta, kanikama apanado en queso crema y wakame con salsa spicy', price: 7600 },
		{ name: 'Tanjiro roll', description: 'Kanikama apanado, palta y cebollín en sésamo, con topping de camarones gratinados en queso crema y mix de salsas', price: 7500 },
		{ name: 'Acevichado roll', description: 'Camarón apanado, palta en sésamo coronado con fresco y exquisito ceviche reineta', price: 10500 },
		{ name: 'Poseidon roll', description: 'Kanikama, palta, cebollín, coronado con gratinado de salmón y queso crema terminado con salsa tery', price: 7000 },
		{ name: 'Platano roll', description: 'Queso crema, cebollín, pollo envuelto en plátano', price: 6500 }
	],
	'HOT ROLLS': [
		{ name: 'Sake hot', description: 'Salmón, queso crema, cebollín en panko', price: 6000 },
		{ name: 'Ebi hot', description: 'Camarón, queso crema, cebollín en panko', price: 6000 },
		{ name: 'Tery hot', description: 'Pollo tery, queso crema, cebollín en panko', price: 6000 },
		{ name: 'Chicken hot', description: 'Pollo apanado, queso crema, cebollín en panko', price: 5500 },
		{ name: 'Kani hot', description: 'Kanikama apanado, queso crema, mango en panko, topping de wakame y kani', price: 5000 },
		{ name: 'Smook hot', description: 'Salmón ahumado, kanikama apanado, queso crema, palta en panko', price: 7500 },
		{ name: 'Yasai hot', description: 'Champiñón tempura, queso crema, cebollín, palmito en panko', price: 6500 }
	],
	'HOT ROLLS ESPECIALES OISHI': [
		{ name: 'Oishi hot', description: 'Camarón apanado, palta en panko con un topping de salmón gratinado y salsa tery', price: 8000 },
		{ name: 'Valencia hot', description: 'Camarón apanado, queso crema, cebollín en panko, topping de camarón mayonesa cebollín, un toque de salsa picante con salsa funji y salsa tery', price: 7500 },
		{ name: 'Osaki hot', description: 'Pescado blanco apanado, salmón ahumado, queso crema en panko con topping de pasta dinamita y salsa tery', price: 7500 },
		{ name: 'Dinamita hot', description: 'Kanikama apanado, queso crema, palta en panko con topping de pescado blanco apanado, mayonesa y salsa picante', price: 7500 },
		{ name: 'Vulcan roll', description: 'Salmón tempura, palta en tempura con pasta dinamita un toque de salsa picante y salsa tery', price: 7500 },
		{ name: 'Spicy hot', description: 'Salmón, queso crema, palta en tempura con salsa spicy y Sriracha', price: 7000 },
		{ name: 'Acevichado hot', description: 'Kanikama tempura, palta en panko con topping de ceviche de reineta', price: 8000 }
	],
	'ROLLS SIN ARROZ': [
		{ name: 'Goku roll', description: 'Salmón, atún, pescado blanco, palta, queso en nori, salsa acevichada y masago', price: 8500 },
		{ name: 'Sake light', description: 'Salmón, queso crema, mango, kanikama apanado, pepino en palta con salsa mayomaracucha', price: 7500 },
		{ name: 'Itachi roll', description: 'Salmón tempurizado, queso crema, kanikama apanado, cebollín en plátano con salsa tery', price: 7500 },
		{ name: 'Chipo roll', description: 'Pollo tery, queso crema, cebollín, tempura crispy en palta', price: 7500 },
		{ name: 'Yamato roll', description: 'Salmón, atún, lechuga, pepino, queso crema, cilantro en hoja de arroz y salsa ponzu', price: 7000 },
		{ name: 'Naruto roll', description: 'Kanikama, salmón, queso crema, camarón y cebollín, envuelto en plaqueta mixta', price: 8000 }
	],
	'HOT VEGETARIANOS': [
		{ name: 'Champi hot', description: 'Champiñón, queso crema, cebollín en panko', price: 5500 },
		{ name: 'Ceviche hot', description: 'Mix de verduras en tempura en panko con ceviche de champiñones', price: 6500 },
		{ name: 'Kento hot', description: 'Palmito, pepino, zanahoria tempura en panko con topping de verduras picaditas con salsa acevichadas', price: 6500 },
		{ name: 'Palmito hot', description: 'Palmito, palta, cebollín en panko con topping de verduras salteadas y papas al hilo', price: 7000 },
		{ name: 'Guacamole vegan', description: 'Champiñón tempura, pepino y cebollín en panko con topping de guacamole', price: 6000 },
		{ name: 'Onion roll', description: 'Palta, champiñón tempura y cebollín en panko topping de aros de cebolla', price: 6500 }
	],
	'ROLLS VEGETARIANOS': [
		{ name: 'Namikaze roll', description: 'Champiñón, queso crema y cebollín en sésamo', price: 5000 },
		{ name: 'Ghambitho roll', description: 'Vegetales temporizados con queso crema en ciboulette', price: 6000 },
		{ name: 'Nagato roll', description: 'Pepino, palmito en palta con topping de verduras crispy y salsa acevichada', price: 5500 },
		{ name: 'Plátano roll vegan', description: 'Verduras tempura, queso crema, cebollín en plátano', price: 5500 },
		{ name: 'Exótico roll', description: 'Champiñón tempura, queso crema, mango, pepino en plátano', price: 6000 },
		{ name: 'Champi avocado', description: 'Champiñón, queso crema, pimentón en palta con topping de cebolla caramelizada', price: 7000 },
		{ name: 'Minato roll', description: 'Palmito, queso crema, pepino en mango y salsa de maracuyá', price: 6000 },
		{ name: 'Primavera roll', description: 'Lechuga, queso crema, mango, palta, pepino, cilantro en hoja de arroz con salsa ponzu', price: 5500 },
		{ name: 'Tropical', description: 'Palmito, mango, queso crema en palta', price: 6000 },
		{ name: 'Crispy vegan', description: 'Champiñón tempura, zanahoria tempura, cebollín en palta con topping de tempura crispy', price: 6500 },
		{ name: 'Vegeta', description: 'Champiñón, queso, pimentón en palta', price: 5000 },
		{ name: 'Ceviche vega', description: 'Palta, cebolla y pepino en palta con topping de ceviche de champiñón', price: 6000 }
	],
	'PROMOCIONES': [
		{ name: '2 Hand Roll', description: 'Hand roll de pollo y hand roll de kanikama', price: 7500, is_special: true },
		{ name: '3 Hand Roll', description: 'Hand roll de pollo, hand roll de kanikama y hand roll de camarones', price: 8000, is_special: true },
		{ name: '20 Piezas', description: '10 piezas de pollo en sésamo o ciboulette, 10 piezas de camarón en panko', price: 8500, is_special: true },
		{ name: '30 Piezas', description: '10 piezas de pollo en sésamo o ciboulette, 10 piezas de camarón en palta, 10 piezas de kanikama en panko', price: 12500, is_special: true },
		{ name: '40 Piezas', description: '10 piezas de pollo en sésamo o ciboulette, 10 piezas de camarón en queso crema, 10 piezas de kanikama en panko, 10 piezas de salmón en palta', price: 16500, is_special: true },
		{ name: '50 Piezas', description: '10 piezas de pollo en queso crema, 10 piezas de camarón en salmón, 10 piezas de salmón en palta, 10 piezas de kanikama en panko, 10 piezas de pollo en panko', price: 22000, is_special: true },
		{ name: '60 Piezas', description: '10 piezas de pollo en sésamo o ciboulette, 10 piezas de salmón en palta, 10 piezas de camarón en salmón, 10 piezas de champiñón en plátano, 10 piezas de pollo en queso crema, 10 piezas de kanikama en panko', price: 26000, is_special: true }
	]
};

async function populateDatabase() {
	console.log('🚀 Iniciando población de base de datos...\n');

	try {
		// 1. Crear categorías
		console.log('📁 Creando categorías...');
		const categoryMap = {};

		for (const category of categories) {
			const { data, error } = await supabase
				.from('categories')
				.upsert(category, { onConflict: 'name' })
				.select()
				.single();

			if (error) {
				console.error(`❌ Error creando categoría ${category.name}:`, error.message);
			} else {
				categoryMap[category.name] = data.id;
				console.log(`✅ Categoría creada: ${category.name}`);
			}
		}

		console.log('\n📦 Creando productos...\n');

		// 2. Crear productos
		let totalProducts = 0;
		for (const [categoryName, products] of Object.entries(productsByCategory)) {
			const categoryId = categoryMap[categoryName];
			if (!categoryId) {
				console.error(`❌ No se encontró ID para categoría: ${categoryName}`);
				continue;
			}

			console.log(`📝 Insertando productos de ${categoryName}...`);

			for (const product of products) {
				const { data, error } = await supabase
					.from('products')
					.upsert({
						...product,
						category_id: categoryId,
						is_active: true,
						is_special: product.is_special || false
					}, { onConflict: 'name' })
					.select()
					.single();

				if (error) {
					console.error(`❌ Error creando producto ${product.name}:`, error.message);
				} else {
					totalProducts++;
					console.log(`  ✅ ${product.name} - $${product.price.toLocaleString('es-CL')}`);
				}
			}
		}

		console.log(`\n✨ ¡Completado! Se crearon ${totalProducts} productos en ${categories.length} categorías.`);
	} catch (error) {
		console.error('❌ Error general:', error);
		process.exit(1);
	}
}

populateDatabase();

