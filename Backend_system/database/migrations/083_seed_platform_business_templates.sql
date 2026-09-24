WITH template_categories(name, description) AS (
  VALUES
    ('Meals', 'Prepared meals and everyday food items.'),
    ('Drinks', 'Beverages and refreshments.'),
    ('Accessories', 'Everyday personal and technology accessories.'),
    ('Bags', 'Bags, cases, and carry items.'),
    ('Clothes', 'Clothing and wearable essentials.'),
    ('Essentials', 'Common household and personal essentials.')
)
INSERT INTO public.categories (name, description)
SELECT name, description
FROM template_categories
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();

WITH template_products(category_name, product_name, product_description) AS (
  VALUES
    ('Meals', 'Jollof Rice', 'Prepared jollof rice meal.'),
    ('Meals', 'Fried Rice', 'Prepared fried rice meal.'),
    ('Meals', 'Chicken and Chips', 'Prepared chicken and chips meal.'),
    ('Meals', 'Beans and Plantain', 'Prepared beans and plantain meal.'),
    ('Drinks', 'Bottled Water', 'Chilled bottled drinking water.'),
    ('Drinks', 'Soft Drink', 'Carbonated soft drink.'),
    ('Drinks', 'Fruit Juice', 'Packaged fruit juice.'),
    ('Drinks', 'Malt Drink', 'Malt beverage.'),
    ('Accessories', 'Phone Charger', 'USB phone charging accessory.'),
    ('Accessories', 'Earphones', 'Wired or wireless earphones.'),
    ('Accessories', 'Power Bank', 'Portable power bank.'),
    ('Accessories', 'Phone Case', 'Protective phone case.'),
    ('Bags', 'Backpack', 'Everyday backpack.'),
    ('Bags', 'Tote Bag', 'Reusable tote bag.'),
    ('Bags', 'Laptop Bag', 'Protective laptop carry bag.'),
    ('Clothes', 'T-Shirt', 'Casual cotton T-shirt.'),
    ('Clothes', 'Jeans', 'Casual denim trousers.'),
    ('Clothes', 'Hoodie', 'Casual hooded sweatshirt.'),
    ('Clothes', 'Cap', 'Everyday cap.'),
    ('Essentials', 'Laundry Detergent', 'Household laundry detergent.'),
    ('Essentials', 'Toiletries Pack', 'Pack of everyday toiletries.'),
    ('Essentials', 'Light Bulb', 'Household LED light bulb.'),
    ('Essentials', 'Hand Sanitizer', 'Hand sanitizer.'),
    ('Essentials', 'Notebook', 'General purpose notebook.')
)
INSERT INTO public.products (category_id, name, description)
SELECT c.id, t.product_name, t.product_description
FROM template_products t
INNER JOIN public.categories c ON c.name = t.category_name
ON CONFLICT (category_id, name) DO UPDATE
SET description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();
