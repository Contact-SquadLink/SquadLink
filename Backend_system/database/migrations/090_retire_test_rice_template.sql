UPDATE public.products
SET
  is_active = FALSE,
  suggested_price_amount = NULL,
  updated_at = NOW()
WHERE LOWER(name) = 'rice'
  AND suggested_price_amount = 7200;

UPDATE public.business_products bp
SET
  is_available = FALSE,
  updated_at = NOW()
FROM public.products p
WHERE bp.product_id = p.id
  AND LOWER(p.name) = 'rice'
  AND p.is_active = FALSE
  AND p.suggested_price_amount IS NULL;