-- =============================================================================
-- RPC: admin_delete_monthly_data y admin_purge_clients
-- Ejecuta en Supabase: SQL Editor → New query → Pegar y Run
--
-- IMPORTANTE: orders.id es BIGINT (no uuid). cash_movements.order_id es bigint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- admin_delete_monthly_data(p_start, p_end, p_branch_id)
-- Borra pedidos (y sus movimientos de caja) del rango de fechas.
-- p_branch_id = null → todas las sucursales; si no, solo esa sucursal.
-- Retorna: { "deleted_orders": N }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_monthly_data(
  p_start timestamptz,
  p_end timestamptz,
  p_branch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_orders int := 0;
  v_order_ids bigint[];
BEGIN
  SELECT array_agg(id) INTO v_order_ids
  FROM public.orders
  WHERE created_at >= p_start AND created_at < p_end
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM public.cash_movements
    WHERE order_id = ANY(v_order_ids);

    WITH deleted AS (
      DELETE FROM public.orders
      WHERE id = ANY(v_order_ids)
      RETURNING id
    )
    SELECT count(*)::int INTO v_deleted_orders FROM deleted;
  END IF;

  RETURN jsonb_build_object('deleted_orders', v_deleted_orders);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_monthly_data(timestamptz, timestamptz, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- admin_purge_clients()
-- Requiere is_admin() y get_user_company_id() existentes.
-- Mantiene un cliente por empresa (preferiendo phone = '0000') y reasigna
-- todos los pedidos a ese cliente antes de borrar el resto (evita FK).
-- Retorna: TABLE(deleted_clients integer)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_purge_clients()
RETURNS TABLE(deleted_clients integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_keep_id uuid;
  v_count int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  v_company_id := get_user_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_not_found' USING errcode = 'P0001';
  END IF;

  SELECT id INTO v_keep_id
  FROM public.clients
  WHERE company_id = v_company_id
  ORDER BY (phone = '0000') DESC NULLS LAST, id ASC
  LIMIT 1;

  IF v_keep_id IS NOT NULL THEN
    UPDATE public.orders
    SET client_id = v_keep_id
    WHERE client_id IN (
      SELECT id FROM public.clients
      WHERE company_id = v_company_id AND id <> v_keep_id
    );
  END IF;

  DELETE FROM public.clients
  WHERE company_id = v_company_id
    AND (v_keep_id IS NULL OR id <> v_keep_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  deleted_clients := v_count;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_purge_clients() TO authenticated;
