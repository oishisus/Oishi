-- TABLA DE INSUMOS DE INVENTARIO
create table if not exists public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  stock numeric default 0,
  unit text default 'un', -- 'kg', 'lt', 'un', 'g', 'ml'
  min_stock numeric default 10,
  cost_price numeric default 0,
  category text, -- 'Verduras', 'Carnes', 'Abarrotes', etc.
  last_restock_date timestamp with time zone
);

-- Habilitar RLS
alter table public.inventory_items enable row level security;

-- Políticas de acceso (Permitir todo a usuarios autenticados por simplicidad en admin)
create policy "Enable all access for authenticated users" 
on public.inventory_items 
for all 
using (auth.role() = 'authenticated');

-- Insertar datos de ejemplo
insert into public.inventory_items (name, stock, unit, min_stock, category) values
('Arroz Sushi', 25, 'kg', 5, 'Abarrotes'),
('Salmón Fresco', 3.5, 'kg', 2, 'Pescados'),
('Palta', 20, 'un', 5, 'Verduras'),
('Queso Crema', 10, 'un', 3, 'Lácteos'),
('Nori', 50, 'un', 10, 'Abarrotes'),
('Camarones', 2, 'kg', 1, 'Mariscos');
