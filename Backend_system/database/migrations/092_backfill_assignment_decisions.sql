INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id)
SELECT d.id, d.rider_id
FROM public.deliveries d
WHERE d.status = 'ASSIGNED'
  AND d.rider_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.delivery_assignment_decisions dad
    WHERE dad.delivery_id = d.id
  )
ON CONFLICT DO NOTHING;