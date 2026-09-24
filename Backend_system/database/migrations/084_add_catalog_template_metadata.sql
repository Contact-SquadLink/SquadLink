ALTER TABLE public.products
  ADD COLUMN image_url TEXT,
  ADD COLUMN suggested_price_amount BIGINT;

ALTER TABLE public.business_products
  ADD COLUMN description TEXT,
  ADD COLUMN image_url TEXT;

ALTER TABLE public.products
  ADD CONSTRAINT chk_products_suggested_price
    CHECK (suggested_price_amount IS NULL OR suggested_price_amount >= 0);

WITH template_products(category_name, product_name, product_description, image_url, suggested_price_amount) AS (
  VALUES
    ('Meals', 'Jollof Rice', 'Party-style jollof rice served with grilled chicken and fried plantain.', 'https://images.pexels.com/photos/32612769/pexels-photo-32612769.jpeg?auto=compress&cs=tinysrgb&w=800', 2500),
    ('Meals', 'Fried Rice', 'Colourful vegetable fried rice with diced carrots, peas, and fresh salad.', 'https://images.pexels.com/photos/32612771/pexels-photo-32612771.jpeg?auto=compress&cs=tinysrgb&w=800', 2200),
    ('Meals', 'Chicken Shawarma', 'Juicy chicken shawarma with fresh vegetables, garlic sauce, and spices.', 'https://images.pexels.com/photos/6416559/pexels-photo-6416559.jpeg?auto=compress&cs=tinysrgb&w=800', 1500),
    ('Meals', 'Beef Burger with Fries', 'Juicy beef burger with cheese, lettuce, tomato, and crispy fries.', 'https://images.pexels.com/photos/16241419/pexels-photo-16241419.jpeg?auto=compress&cs=tinysrgb&w=800', 2000),
    ('Drinks', 'Bottled Water', 'Chilled bottled drinking water for everyday refreshment.', 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=800', 500),
    ('Drinks', 'Soft Drink', 'Cold carbonated soft drink, ideal with meals and snacks.', 'https://images.pexels.com/photos/5869812/pexels-photo-5869812.jpeg?auto=compress&cs=tinysrgb&w=800', 800),
    ('Drinks', 'Fruit Juice', 'Refreshing packaged fruit juice made for convenient serving.', 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800', 1200),
    ('Drinks', 'Malt Drink', 'Rich malt beverage served chilled.', 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg?auto=compress&cs=tinysrgb&w=800', 1000)
)
UPDATE public.products p
SET
  description = t.product_description,
  image_url = t.image_url,
  suggested_price_amount = t.suggested_price_amount,
  updated_at = NOW()
FROM template_products t
WHERE EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.id = p.category_id
    AND c.name = t.category_name
)
  AND p.name = t.product_name;