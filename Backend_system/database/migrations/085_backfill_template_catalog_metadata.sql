WITH template_products(category_name, product_name, product_description, image_url, suggested_price_amount) AS (
  VALUES
    ('Groceries', 'Rice', 'Quality long-grain rice for jollof, fried rice, and everyday meals.', 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800', 7200),
    ('Meals', 'Jollof Rice', 'Party-style jollof rice served with grilled chicken and fried plantain.', 'https://images.pexels.com/photos/32612769/pexels-photo-32612769.jpeg?auto=compress&cs=tinysrgb&w=800', 2500),
    ('Meals', 'Fried Rice', 'Colourful vegetable fried rice with diced carrots, peas, and fresh salad.', 'https://images.pexels.com/photos/32612771/pexels-photo-32612771.jpeg?auto=compress&cs=tinysrgb&w=800', 2200),
    ('Meals', 'Chicken and Chips', 'Crispy chicken served with golden chips and a savoury dipping sauce.', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800', 2200),
    ('Meals', 'Beans and Plantain', 'Seasoned beans served with sweet fried plantain.', 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800', 1800),
    ('Drinks', 'Bottled Water', 'Chilled bottled drinking water for everyday refreshment.', 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=800', 500),
    ('Drinks', 'Soft Drink', 'Cold carbonated soft drink, ideal with meals and snacks.', 'https://images.pexels.com/photos/5869812/pexels-photo-5869812.jpeg?auto=compress&cs=tinysrgb&w=800', 800),
    ('Drinks', 'Fruit Juice', 'Refreshing packaged fruit juice made for convenient serving.', 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800', 1200),
    ('Drinks', 'Malt Drink', 'Rich malt beverage served chilled.', 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg?auto=compress&cs=tinysrgb&w=800', 1000),
    ('Accessories', 'Phone Charger', 'Fast-charging USB phone charger for everyday devices.', 'https://images.pexels.com/photos/4219861/pexels-photo-4219861.jpeg?auto=compress&cs=tinysrgb&w=800', 3500),
    ('Accessories', 'Earphones', 'Compact earphones for calls, music, and daily listening.', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800', 3500),
    ('Accessories', 'Power Bank', 'Portable power bank for charging devices on the go.', 'https://images.pexels.com/photos/38649173/pexels-photo-38649173.jpeg?auto=compress&cs=tinysrgb&w=800', 5500),
    ('Accessories', 'Phone Case', 'Protective phone case with a durable everyday finish.', 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=800', 2500),
    ('Bags', 'Backpack', 'Durable everyday backpack with practical storage space.', 'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg?auto=compress&cs=tinysrgb&w=800', 6500),
    ('Bags', 'Tote Bag', 'Reusable tote bag for shopping, work, and daily errands.', 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800', 2500),
    ('Bags', 'Laptop Bag', 'Protective laptop carry bag with organised compartments.', 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800', 8500),
    ('Clothes', 'T-Shirt', 'Casual cotton T-shirt suitable for everyday wear.', 'https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?auto=compress&cs=tinysrgb&w=800', 4500),
    ('Clothes', 'Jeans', 'Classic casual denim trousers with a comfortable fit.', 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 9000),
    ('Clothes', 'Hoodie', 'Warm casual hooded sweatshirt for relaxed everyday wear.', 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 8500),
    ('Clothes', 'Cap', 'Everyday cap with an adjustable comfortable fit.', 'https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg?auto=compress&cs=tinysrgb&w=800', 2500),
    ('Essentials', 'Laundry Detergent', 'Household laundry detergent for hand and machine washing.', 'https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=800', 3200),
    ('Essentials', 'Toiletries Pack', 'Pack of everyday toiletries for home and travel.', 'https://images.pexels.com/photos/3737612/pexels-photo-3737612.jpeg?auto=compress&cs=tinysrgb&w=800', 4500),
    ('Essentials', 'Light Bulb', 'Energy-saving household LED light bulb.', 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=800', 1800),
    ('Essentials', 'Hand Sanitizer', 'Convenient hand sanitizer for everyday hygiene.', 'https://images.pexels.com/photos/3987143/pexels-photo-3987143.jpeg?auto=compress&cs=tinysrgb&w=800', 1200),
    ('Essentials', 'Notebook', 'General purpose notebook for school, work, and notes.', 'https://images.pexels.com/photos/733857/pexels-photo-733857.jpeg?auto=compress&cs=tinysrgb&w=800', 1200)
)
UPDATE public.products p
SET
  description = t.product_description,
  image_url = t.image_url,
  suggested_price_amount = t.suggested_price_amount,
  updated_at = NOW()
FROM template_products t
WHERE p.name = t.product_name
  AND EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = p.category_id
      AND c.name = t.category_name
  );