-- 1. CREACIÓN DE TABLAS (Si no existen)
CREATE TABLE IF NOT EXISTS categories (
	id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
	name TEXT NOT NULL,
	"order" INTEGER DEFAULT 0,
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
	id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
	category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	description TEXT,
	price INTEGER NOT NULL,
	image_url TEXT,
	is_active BOOLEAN DEFAULT TRUE,
	is_special BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. LIMPIEZA INICIAL (Opcional, descomentar si necesitas resetear)
-- DELETE FROM products;
-- DELETE FROM categories;

-- 3. INSERCIÓN DE CATEGORÍAS
INSERT INTO categories (name, "order") VALUES 
('GOHAN', 1),
('CEVICHES Y PLATOS FRÍOS OISHI', 2),
('PLATOS CALIENTES ESPECIALES', 3),
('ENTRADAS CALIENTES', 4),
('SASHIMI', 5),
('ROLLS CALIFORNIA', 6),
('ROLLS TRADICIONALES', 7),
('ROLLS DE LA CASA OISHI', 8),
('HOT ROLLS', 9),
('HOT ROLLS ESPECIALES OISHI', 10),
('ROLLS SIN ARROZ', 11),
('HOT VEGETARIANOS', 12),
('ROLLS VEGETARIANOS', 13),
('PROMOCIONES', 14)
ON CONFLICT DO NOTHING;

-- 4. INSERCIÓN DE PRODUCTOS MASIVA
DO $$
DECLARE
	cat_id UUID;
BEGIN
	-- GOHAN
	SELECT id INTO cat_id FROM categories WHERE name = 'GOHAN';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Gohan de Pollo', 'Bowl con base de arroz, palta, cebollín y queso crema con pollo', 6000),
	(cat_id, 'Gohan de Camarones', 'Bowl con base de arroz, palta, cebollín y queso crema con camarones', 6500),
	(cat_id, 'Gohan de Salmón', 'Bowl con base de arroz, palta, cebollín y queso crema con salmón', 7000),
	(cat_id, 'Gohan de Salmón Camarones', 'Bowl con base de arroz, palta, cebollín y queso crema con salmón y camarones', 7500),
	(cat_id, 'Gohan Salmón Pollo', 'Bowl con base de arroz, palta, cebollín y queso crema con salmón y pollo', 7500),
	(cat_id, 'Gohan Acevichado', 'Bowl con base de arroz, palta, cebollín y queso crema con proteína acevichada', 8000),
	(cat_id, 'Gohan de Vegetales', 'Bowl con base de arroz, palta, cebollín y queso crema con vegetales', 6000);

	-- CEVICHES Y PLATOS FRÍOS OISHI
	SELECT id INTO cat_id FROM categories WHERE name = 'CEVICHES Y PLATOS FRÍOS OISHI';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Ceviche de Reineta', 'Reineta fresca, cebolla, leche de tigre, limón, camote cocido, canchita choclo peruano y cilantro', 10000),
	(cat_id, 'Ceviche Mixto', 'Finos cortes de reineta, salmón y camarón, leche tigre, limón, camote cocido canchita, choclo peruano y cilantro', 10500),
	(cat_id, 'Ceviche de Salmón', 'Finos cortes de salmón, cebolla, leche de tigre, limón, camote cocido, canchita choclo peruano y cilantro', 10500),
	(cat_id, 'Ceviche de Ají Amarillo', 'Finos cortes de reineta y camarón en salsa acevichada con un toque de salsa de ají amarillo, palta y cilantro', 10000),
	(cat_id, 'Ceviche de Champiñón', 'Champiñones frescos, pimentón, cebolla, leche tigre, limón, camote cocido palta y cilantro', 8000),
	(cat_id, 'Palta Acevichada', 'Cuadritos de palta, pimentón, coronada con ceviche de reineta salsa de ají amarillo y un toque de masago', 12000),
	(cat_id, 'Tiraditos de Salmón', '12 finos cortes de salmón bañados en salsa especial oishi con un toque de salsa spice', 12500),
	(cat_id, 'Tiraditos de Atún', '12 finos cortes de atún con palta, bañado en salsa especial oishi con un toque de togarashi y cilantro', 12000);

	-- PLATOS CALIENTES ESPECIALES
	SELECT id INTO cat_id FROM categories WHERE name = 'PLATOS CALIENTES ESPECIALES';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Lomo Salteado', 'Lomo salteado con vegetales estilo peruano acompañado de arroz y papas fritas', 12500),
	(cat_id, 'Tallarines a la Huancaína con Pollo', 'Tallarines en salsa huancaína acompañado de pollo', 9000),
	(cat_id, 'Tallarines a la Huancaína con Lomo', 'Tallarines en salsa huancaína acompañado de lomo', 11500),
	(cat_id, 'Tallarines a la Huancaína con Marisco', 'Tallarines en salsa huancaína acompañado de marisco', 11000),
	(cat_id, 'Arroz con Mariscos', 'Arroz con mariscos aderezado con exquisita salsa de ají amarillo, coronado con ensalada criolla', 11000),
	(cat_id, 'Tepanyaki', 'Arroz frito estilo tailandés acompañado con cebolla y champiñones con la proteína de tu elección a la plancha', 7000),
	(cat_id, 'Pollo Takiri', 'Pollo salteado con champiñones, arroz y ensalada fresca', 8000),
	(cat_id, 'Pescado Blanco', 'Pescado blanco en salsa blanca con champiñones acompañado con arroz o papa salteada', 10500),
	(cat_id, 'Tataki de Atún', 'Atún sellado con pimienta y aceite de sésamo acompañado de arroz y verduras salteadas', 10500),
	(cat_id, 'Salmón al Grill', 'Salmón bañado con pebre y con un toque de salsa ají amarillo acompañado con arroz o papas', 12500);

	-- ENTRADAS CALIENTES
	SELECT id INTO cat_id FROM categories WHERE name = 'ENTRADAS CALIENTES';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Gyozas Pollo o Cerdo', '5 unidades de gyozas de pollo o cerdo', 3800),
	(cat_id, 'Gyozas Camarón', '5 unidades de gyozas de camarón', 4000),
	(cat_id, 'Ebi Cheese', '5 camarones, queso crema apanados y salsa tártara', 4500),
	(cat_id, 'Ebi Furay', '5 camarones apanados con salsa tártara', 4000),
	(cat_id, 'Champi Cheese', '5 champiñones rellenos de queso crema y verduras', 4500),
	(cat_id, 'Croquetas de Salmón', '5 unidades con salsa tártara', 4500),
	(cat_id, 'Ebi Balls', '5 bolitas de camarón, queso crema apanado y salsa funji', 5000),
	(cat_id, 'Arrollado Primavera', '5 unidades con salsa soya o teriyaki', 3500),
	(cat_id, 'Arrollado Jamón Queso', '5 unidades con salsa soya o teriyaki', 3500),
	(cat_id, 'Wakame', 'Frescas algas aderezadas', 4000),
	(cat_id, 'Ensalada Dinamita', 'Wakame y kanikama con salsa acevichada', 5000),
	(cat_id, 'Pollo Kids', 'Trocitos de pollo apanado', 4000);

	-- SASHIMI
	SELECT id INTO cat_id FROM categories WHERE name = 'SASHIMI';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Sashimi 3 Cortes', '3 cortes de salmón, atún o mixto', 4000),
	(cat_id, 'Sashimi 6 Cortes', '6 cortes de salmón, atún o mixto', 7000),
	(cat_id, 'Sashimi 9 Cortes', '9 cortes de salmón, atún o mixto', 9500);

	-- ROLLS CALIFORNIA
	SELECT id INTO cat_id FROM categories WHERE name = 'ROLLS CALIFORNIA';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'California Roll', 'Kanikama, pepino, palta en masago', 5000),
	(cat_id, 'Alaska Rolls', 'Salmón, queso crema, palta en sésamo', 5500),
	(cat_id, 'Ebi California', 'Camarón apanado, queso crema y cebollín', 5000),
	(cat_id, 'Chicken California', 'Pollo apanado, queso crema, kanikama apanado', 5000),
	(cat_id, 'Tery California', 'Pollo teriyaki, queso y pimentón', 5500),
	(cat_id, 'Tuna California', 'Atún, queso y pepino', 5000),
	(cat_id, 'Ebi Fresh', 'Camarón, queso crema y palta', 5000),
	(cat_id, 'Mango California', 'Mango, queso crema, kanikama apanado', 5000);

	-- ROLLS TRADICIONALES
	SELECT id INTO cat_id FROM categories WHERE name = 'ROLLS TRADICIONALES';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Avocado de Salmón', 'Salmón, queso crema en palta', 6500),
	(cat_id, 'Avocado de camarón', 'Camarón, queso crema, cebollín en palta', 6200),
	(cat_id, 'Ebi roll', 'Camarón, queso crema, palta en sésamo', 6500),
	(cat_id, 'Maguro roll', 'Atún, palta en queso crema', 6000),
	(cat_id, 'Chicken tery', 'Pollo teriyaki, queso crema y cebollín en palta', 5800),
	(cat_id, 'Chicken krispy', 'Pollo apanado, queso crema, cebollín en palta', 6000),
	(cat_id, 'Zetsu', 'Pollo apanado, palta, cebollín en queso crema', 6500),
	(cat_id, 'Ebi sake roll', 'Salmón, camarón apanado, cebollín en palta', 6500),
	(cat_id, 'Ebi exotic', 'Camarón, queso crema, mango en salmón', 6500),
	(cat_id, 'Ebi cheese', 'Camarón apanado, palta en queso crema flameado y salsa tery', 5900),
	(cat_id, 'Ichiro roll', 'Salmón, palta, cebollín en atún, y salsa acevichada', 6000),
	(cat_id, 'Kilua', 'Pollo apanado, palta, cebollín en queso crema', 6000);

	-- ROLLS DE LA CASA OISHI
	SELECT id INTO cat_id FROM categories WHERE name = 'ROLLS DE LA CASA OISHI';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Fuji roll', 'Camarones apanado, queso crema, con topping de camarones en tempura y exquisita salsa fuji', 7000),
	(cat_id, 'Ebi avocado', 'Salmón, camarón, queso crema en palta', 7500),
	(cat_id, 'Alaska fresh', 'Salmón, queso crema, mango en palta y salmón', 8000),
	(cat_id, 'Maracuyá roll', 'Salmón tempura, palta y tempura crispy en queso y salsa de maracuyá', 8000),
	(cat_id, 'Smook cheese', 'Camarón apanado, palta y cebollín en queso crema flameado con chimichurri y salsa tery', 6500),
	(cat_id, 'Lemon roll', 'Salmón tempura, queso crema, palta, palta en salmón y rodajas de limón con salsa tery', 7000),
	(cat_id, 'Rainbow roll', 'Salmón, atún, queso crema y mango en plaqueta mixta de pescados, mango y palta', 7000),
	(cat_id, 'Uzumaki roll', 'Salmón ahumado, queso crema y kanikama apanado en plátano con puntos de salsa dinamita y salsa tery', 7000),
	(cat_id, 'Futo rainbow', 'Salmón, atún, queso crema y mango en nori, salsa acevichada y toques de masago', 8000),
	(cat_id, 'Selva green', 'Camarón tempura, palta, kanikama apanado en queso crema y wakame con salsa spicy', 7600),
	(cat_id, 'Tanjiro roll', 'Kanikama apanado, palta y cebollín en sésamo, con topping de camarones gratinados en queso crema y mix de salsas', 7500),
	(cat_id, 'Acevichado roll', 'Camarón apanado, palta en sésamo coronado con fresco y exquisito ceviche reineta', 10500),
	(cat_id, 'Poseidon roll', 'Kanikama, palta, cebollín, coronado con gratinado de salmón y queso crema terminado con salsa tery', 7000),
	(cat_id, 'Platano roll', 'Queso crema, cebollín, pollo envuelto en plátano', 6500);

	-- HOT ROLLS
	SELECT id INTO cat_id FROM categories WHERE name = 'HOT ROLLS';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Sake hot', 'Salmón, queso crema, cebollín en panko', 6000),
	(cat_id, 'Ebi hot', 'Camarón, queso crema, cebollín en panko', 6000),
	(cat_id, 'Tery hot', 'Pollo tery, queso crema, cebollín en panko', 6000),
	(cat_id, 'Chicken hot', 'Pollo apanado, queso crema, cebollín en panko', 5500),
	(cat_id, 'Kani hot', 'Kanikama apanado, queso crema, mango en panko, topping de wakame y kani', 5000),
	(cat_id, 'Smook hot', 'Salmón ahumado, kanikama apanado, queso crema, palta en panko', 7500),
	(cat_id, 'Yasai hot', 'Champiñón tempura, queso crema, cebollín, palmito en panko', 6500);

	-- HOT ROLLS ESPECIALES OISHI
	SELECT id INTO cat_id FROM categories WHERE name = 'HOT ROLLS ESPECIALES OISHI';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Oishi hot', 'Camarón apanado, palta en panko con un topping de salmón gratinado y salsa tery', 8000),
	(cat_id, 'Valencia hot', 'Camarón apanado, queso crema, cebollín en panko, topping de camarón mayonesa cebollín, un toque de salsa picante con salsa funji y salsa tery', 7500),
	(cat_id, 'Osaki hot', 'Pescado blanco apanado, salmón ahumado, queso crema en panko con topping de pasta dinamita y salsa tery', 7500),
	(cat_id, 'Dinamita hot', 'Kanikama apanado, queso crema, palta en panko con topping de pescado blanco apanado, mayonesa y salsa picante', 7500),
	(cat_id, 'Vulcan roll', 'Salmón tempura, palta en tempura con pasta dinamita un toque de salsa picante y salsa tery', 7500),
	(cat_id, 'Spicy hot', 'Salmón, queso crema, palta en tempura con salsa spicy y Sriracha', 7000),
	(cat_id, 'Acevichado hot', 'Kanikama tempura, palta en panko con topping de ceviche de reineta', 8000);

	-- ROLLS SIN ARROZ
	SELECT id INTO cat_id FROM categories WHERE name = 'ROLLS SIN ARROZ';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Goku roll', 'Salmón, atún, pescado blanco, palta, queso en nori, salsa acevichada y masago', 8500),
	(cat_id, 'Sake light', 'Salmón, queso crema, mango, kanikama apanado, pepino en palta con salsa mayomaracucha', 7500),
	(cat_id, 'Itachi roll', 'Salmón tempurizado, queso crema, kanikama apanado, cebollín en plátano con salsa tery', 7500),
	(cat_id, 'Chipo roll', 'Pollo tery, queso crema, cebollín, tempura crispy en palta', 7500),
	(cat_id, 'Yamato roll', 'Salmón, atún, lechuga, pepino, queso crema, cilantro en hoja de arroz y salsa ponzu', 7000),
	(cat_id, 'Naruto roll', 'Kanikama, salmón, queso crema, camarón y cebollín, envuelto en plaqueta mixta', 8000);

	-- HOT VEGETARIANOS
	SELECT id INTO cat_id FROM categories WHERE name = 'HOT VEGETARIANOS';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Champi hot', 'Champiñón, queso crema, cebollín en panko', 5500),
	(cat_id, 'Ceviche hot', 'Mix de verduras en tempura en panko con ceviche de champiñones', 6500),
	(cat_id, 'Kento hot', 'Palmito, pepino, zanahoria tempura en panko con topping de verduras picaditas con salsa acevichadas', 6500),
	(cat_id, 'Palmito hot', 'Palmito, palta, cebollín en panko con topping de verduras salteadas y papas al hilo', 7000),
	(cat_id, 'Guacamole vegan', 'Champiñón tempura, pepino y cebollín en panko con topping de guacamole', 6000),
	(cat_id, 'Onion roll', 'Palta, champiñón tempura y cebollín en panko topping de aros de cebolla', 6500);

	-- ROLLS VEGETARIANOS
	SELECT id INTO cat_id FROM categories WHERE name = 'ROLLS VEGETARIANOS';
	INSERT INTO products (category_id, name, description, price) VALUES
	(cat_id, 'Namikaze roll', 'Champiñón, queso crema y cebollín en sésamo', 5000),
	(cat_id, 'Ghambitho roll', 'Vegetales temporizados con queso crema en ciboulette', 6000),
	(cat_id, 'Nagato roll', 'Pepino, palmito en palta con topping de verduras crispy y salsa acevichada', 5500),
	(cat_id, 'Plátano roll vegan', 'Verduras tempura, queso crema, cebollín en plátano', 5500),
	(cat_id, 'Exótico roll', 'Champiñón tempura, queso crema, mango, pepino en plátano', 6000),
	(cat_id, 'Champi avocado', 'Champiñón, queso crema, pimentón en palta con topping de cebolla caramelizada', 7000),
	(cat_id, 'Minato roll', 'Palmito, queso crema, pepino en mango y salsa de maracuyá', 6000),
	(cat_id, 'Primavera roll', 'Lechuga, queso crema, mango, palta, pepino, cilantro en hoja de arroz con salsa ponzu', 5500),
	(cat_id, 'Tropical', 'Palmito, mango, queso crema en palta', 6000),
	(cat_id, 'Crispy vegan', 'Champiñón tempura, zanahoria tempura, cebollín en palta con topping de tempura crispy', 6500),
	(cat_id, 'Vegeta', 'Champiñón, queso, pimentón en palta', 5000),
	(cat_id, 'Ceviche vega', 'Palta, cebolla y pepino en palta con topping de ceviche de champiñón', 6000);

	-- PROMOCIONES
	SELECT id INTO cat_id FROM categories WHERE name = 'PROMOCIONES';
	INSERT INTO products (category_id, name, description, price, is_special) VALUES
	(cat_id, '2 Hand Roll', 'Hand roll de pollo y hand roll de kanikama', 7500, true),
	(cat_id, '3 Hand Roll', 'Hand roll de pollo, hand roll de kanikama y hand roll de camarones', 8000, true),
	(cat_id, '20 Piezas', '10 piezas de pollo en sésamo o ciboulette, 10 piezas de camarón en panko', 8500, true),
	(cat_id, '30 Piezas', '10 piezas de pollo en sésamo o ciboulette, 10 piezas de camarón en palta, 10 piezas de kanikama en panko', 12500, true),
	(cat_id, '40 Piezas', '10 piezas de pollo en sésamo o ciboulette, 10 piezas de camarón en queso crema, 10 piezas de kanikama en panko, 10 piezas de salmón en palta', 16500, true),
	(cat_id, '50 Piezas', '10 piezas de pollo en queso crema, 10 piezas de camarón en salmón, 10 piezas de salmón en palta, 10 piezas de kanikama en panko, 10 piezas de pollo en panko', 22000, true),
	(cat_id, '60 Piezas', '10 piezas de pollo en sésamo o ciboulette, 10 piezas de salmón en palta, 10 piezas de camarón en salmón, 10 piezas de champiñón en plátano, 10 piezas de pollo en queso crema, 10 piezas de kanikama en panko', 26000, true);

END $$;
