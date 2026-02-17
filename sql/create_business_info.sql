-- TABLA DE INFORMACIÓN DEL NEGOCIO
create table if not exists public.business_info (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text default 'Oishi Sushi',
  phone text default '+56900000000',
  address text default 'Dirección del local',
  instagram text default '@oishi.sushi',
  schedule text default 'Lunes a Domingo: 12:00 - 23:00',
  bank_details text default 'Banco Estado\nCuenta RUT: 12345678-9\nNombre: Juan Perez\nEmail: contacto@oishi.cl'
);

-- Habilitar RLS
alter table public.business_info enable row level security;

-- Políticas: Todos pueden leer (público), solo authenticated puede actualizar
create policy "Allow public read access" 
on public.business_info for select 
using (true);

create policy "Allow authenticated update access" 
on public.business_info for update 
using (auth.role() = 'authenticated');

create policy "Allow authenticated insert access" 
on public.business_info for insert 
using (auth.role() = 'authenticated');

-- Insertar fila inicial si no existe
insert into public.business_info (name)
select 'Oishi Sushi'
where not exists (select 1 from public.business_info);
