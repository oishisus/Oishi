-- 1. CREACIÓN DE TABLAS
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE products (
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

-- 2. INSERCIÓN DE CATEGORÍAS (Ordenadas)
INSERT INTO categories (name, "order") VALUES 
('GOHAN', 1),
('CEVICHES Y PLATOS FRÍOS', 2),
('PLATOS CALIENTES ESPECIALES', 3),
('ENTRADAS CALIENTES', 4),
('SASHIMI', 5),
('ROLLS CALIFORNIA', 6),
('ROLLS TRADICIONALES', 7),
('ROLLS DE LA CASA OISHI', 8),
('HOT ROLLS (PANKO)', 9),
('HOT ROLLS ESPECIALES', 10),
('ROLLS SIN ARROZ', 11),
('HOT VEGETARIANOS', 12),
('ROLLS VEGETARIANOS', 13),
('PROMOCIONES', 14);

-- 3. INSERCIÓN DE PRODUCTOS (Ejemplos por categoría para no saturar el script inicial, pero con la estructura lista)
-- Nota: Para una carga masiva total de los ~100 items, se recomienda usar este formato.

-- Categoría GOHAN (Asumiendo que obtenemos el ID de la categoría insertada arriba)
DO $$
DECLARE
  cat_gohan UUID;
  cat_ceviche UUID;
  cat_hot_rolls UUID;
BEGIN
  SELECT id INTO cat_gohan FROM categories WHERE name = 'GOHAN';
  SELECT id INTO cat_ceviche FROM categories WHERE name = 'CEVICHES Y PLATOS FRÍOS';
  
  INSERT INTO products (category_id, name, description, price) VALUES
  (cat_gohan, 'Gohan de Pollo', 'Bowl con base de arroz, palta, cebollín y queso crema con pollo', 6000),
  (cat_gohan, 'Gohan de Camarones', 'Bowl con base de arroz, palta, cebollín y queso crema con camarones', 6500),
  (cat_gohan, 'Gohan de Salmón', 'Bowl con base de arroz, palta, cebollín y queso crema con salmón', 7000),
  (cat_gohan, 'Gohan Acevichado', 'Bowl con base de arroz, palta, cebollín y queso crema con salsa acevichada', 8000);

  INSERT INTO products (category_id, name, description, price) VALUES
  (cat_ceviche, 'Ceviche de Reineta', 'Reineta fresca, cebolla, leche de tigre, limón, camote cocido, canchita choclo peruano y cilantro', 10000),
  (cat_ceviche, 'Ceviche Mixto', 'Finos cortes de reineta, salmón y camarón, leche tigre, limón, camote cocido canchita, choclo', 10500),
  (cat_ceviche, 'Palta Acevichada', 'Cuadritos de palta, pimentón, coronada con ceviche de reineta salsa de ají amarillo', 12000);
END $$;
