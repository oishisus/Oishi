-- Agregar columnas para datos bancarios completos
ALTER TABLE public.business_info 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_type text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_rut text,
ADD COLUMN IF NOT EXISTS account_email text;

-- Comentarios para documentar las columnas
COMMENT ON COLUMN public.business_info.bank_name IS 'Nombre del banco (ej. Banco Estado)';
COMMENT ON COLUMN public.business_info.account_type IS 'Tipo de cuenta (ej. Cuenta RUT, Cuenta Vista)';
COMMENT ON COLUMN public.business_info.account_number IS 'Número de cuenta bancaria';
COMMENT ON COLUMN public.business_info.account_rut IS 'RUT del titular de la cuenta';
COMMENT ON COLUMN public.business_info.account_email IS 'Email de contacto para transferencias';

-- Nota: El nombre del titular se usa del campo 'name' que ya existe en la tabla
