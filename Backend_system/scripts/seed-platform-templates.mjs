import 'dotenv/config';
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });

const TEMPLATE_CATEGORIES = [
  { name: 'Meals', description: 'Prepared meals and everyday food items.' },
  { name: 'Drinks', description: 'Beverages and refreshments.' },
  { name: 'Groceries', description: 'Everyday grocery items and kitchen staples.' },
  { name: 'Accessories', description: 'Everyday personal and technology accessories.' },
  { name: 'Bags', description: 'Bags, cases, and carry items.' },
  { name: 'Clothes', description: 'Clothing and wearable essentials.' },
  { name: 'Essentials', description: 'Common household and personal essentials.' },
];

const TEMPLATE_PRODUCTS = [
  // Meals
  {
    category: 'Meals',
    name: 'Jollof Rice',
    description: 'Party-style jollof rice served with grilled chicken and fried plantain.',
    imageUrl: 'https://images.pexels.com/photos/32612769/pexels-photo-32612769.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2500,
  },
  {
    category: 'Meals',
    name: 'Fried Rice',
    description: 'Colourful vegetable fried rice with diced carrots, peas, and fresh salad.',
    imageUrl: 'https://images.pexels.com/photos/32612771/pexels-photo-32612771.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2200,
  },
  {
    category: 'Meals',
    name: 'Chicken and Chips',
    description: 'Crispy chicken served with golden chips and a savoury dipping sauce.',
    imageUrl: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2200,
  },
  {
    category: 'Meals',
    name: 'Beans and Plantain',
    description: 'Seasoned beans served with sweet fried plantain.',
    imageUrl: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1800,
  },
  {
    category: 'Meals',
    name: 'Chicken Shawarma',
    description: 'Juicy chicken shawarma with fresh vegetables, garlic sauce, and spices.',
    imageUrl: 'https://images.pexels.com/photos/6416559/pexels-photo-6416559.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1500,
  },
  {
    category: 'Meals',
    name: 'Beef Burger with Fries',
    description: 'Juicy beef burger with cheese, lettuce, tomato, and crispy fries.',
    imageUrl: 'https://images.pexels.com/photos/16241419/pexels-photo-16241419.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2000,
  },

  // Drinks
  {
    category: 'Drinks',
    name: 'Bottled Water',
    description: 'Chilled bottled drinking water for everyday refreshment.',
    imageUrl: 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 500,
  },
  {
    category: 'Drinks',
    name: 'Soft Drink',
    description: 'Cold carbonated soft drink, ideal with meals and snacks.',
    imageUrl: 'https://images.pexels.com/photos/5869812/pexels-photo-5869812.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 800,
  },
  {
    category: 'Drinks',
    name: 'Fruit Juice',
    description: 'Refreshing packaged fruit juice made for convenient serving.',
    imageUrl: 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1200,
  },
  {
    category: 'Drinks',
    name: 'Malt Drink',
    description: 'Rich malt beverage served chilled.',
    imageUrl: 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1000,
  },

  // Accessories
  {
    category: 'Accessories',
    name: 'Phone Charger',
    description: 'Fast-charging USB phone charger for everyday devices.',
    imageUrl: 'https://images.pexels.com/photos/4219861/pexels-photo-4219861.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 3500,
  },
  {
    category: 'Accessories',
    name: 'Earphones',
    description: 'Compact earphones for calls, music, and daily listening.',
    imageUrl: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 3500,
  },
  {
    category: 'Accessories',
    name: 'Power Bank',
    description: 'Portable power bank for charging devices on the go.',
    imageUrl: 'https://images.pexels.com/photos/38649173/pexels-photo-38649173.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 5500,
  },
  {
    category: 'Accessories',
    name: 'Phone Case',
    description: 'Protective phone case with a durable everyday finish.',
    imageUrl: 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2500,
  },

  // Bags
  {
    category: 'Bags',
    name: 'Backpack',
    description: 'Durable everyday backpack with practical storage space.',
    imageUrl: 'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 6500,
  },
  {
    category: 'Bags',
    name: 'Tote Bag',
    description: 'Reusable tote bag for shopping, work, and daily errands.',
    imageUrl: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2500,
  },
  {
    category: 'Bags',
    name: 'Laptop Bag',
    description: 'Protective laptop carry bag with organised compartments.',
    imageUrl: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 8500,
  },

  // Clothes
  {
    category: 'Clothes',
    name: 'T-Shirt',
    description: 'Casual cotton T-shirt suitable for everyday wear.',
    imageUrl: 'https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 4500,
  },
  {
    category: 'Clothes',
    name: 'Jeans',
    description: 'Classic casual denim trousers with a comfortable fit.',
    imageUrl: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 9000,
  },
  {
    category: 'Clothes',
    name: 'Hoodie',
    description: 'Warm casual hooded sweatshirt for relaxed everyday wear.',
    imageUrl: 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 8500,
  },
  {
    category: 'Clothes',
    name: 'Cap',
    description: 'Everyday cap with an adjustable comfortable fit.',
    imageUrl: 'https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 2500,
  },

  // Essentials
  {
    category: 'Essentials',
    name: 'Laundry Detergent',
    description: 'Household laundry detergent for hand and machine washing.',
    imageUrl: 'https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 3200,
  },
  {
    category: 'Essentials',
    name: 'Toiletries Pack',
    description: 'Pack of everyday toiletries for home and travel.',
    imageUrl: 'https://images.pexels.com/photos/3737612/pexels-photo-3737612.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 4500,
  },
  {
    category: 'Essentials',
    name: 'Light Bulb',
    description: 'Energy-saving household LED light bulb.',
    imageUrl: 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1800,
  },
  {
    category: 'Essentials',
    name: 'Hand Sanitizer',
    description: 'Convenient hand sanitizer for everyday hygiene.',
    imageUrl: 'https://images.pexels.com/photos/3987143/pexels-photo-3987143.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1200,
  },
  {
    category: 'Essentials',
    name: 'Notebook',
    description: 'General purpose notebook for school, work, and notes.',
    imageUrl: 'https://images.pexels.com/photos/733857/pexels-photo-733857.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1200,
  },

  // Groceries
  {
    category: 'Groceries',
    name: 'Pure Cooking Oil',
    description: 'Pure vegetable cooking oil for home and commercial food preparation.',
    imageUrl: 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 4500,
  },
  {
    category: 'Groceries',
    name: 'Spaghetti Pack',
    description: 'Enriched durum wheat spaghetti pasta pack.',
    imageUrl: 'https://images.pexels.com/photos/128402/pexels-photo-128402.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 900,
  },
  {
    category: 'Groceries',
    name: 'Iodized Table Salt',
    description: 'Pure iodized fine table cooking salt pack.',
    imageUrl: 'https://images.pexels.com/photos/6692131/pexels-photo-6692131.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 400,
  },
  {
    category: 'Groceries',
    name: 'Granulated Sugar',
    description: 'Refined white granulated sugar pack.',
    imageUrl: 'https://images.pexels.com/photos/209339/pexels-photo-209339.jpeg?auto=compress&cs=tinysrgb&w=800',
    suggestedPrice: 1200,
  },
];

async function seedTemplates() {
  await client.connect();
  console.log('Ensuring categories exist...');

  const categoryMap = new Map();
  for (const cat of TEMPLATE_CATEGORIES) {
    const res = await client.query(
      `INSERT INTO public.categories (name, description, is_active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (name) DO UPDATE
       SET description = EXCLUDED.description, is_active = TRUE, updated_at = NOW()
       RETURNING id, name;`,
      [cat.name, cat.description]
    );
    categoryMap.set(res.rows[0].name, res.rows[0].id);
  }

  console.log('Seeding platform product templates...');
  let count = 0;
  for (const prod of TEMPLATE_PRODUCTS) {
    const categoryId = categoryMap.get(prod.category);
    if (!categoryId) {
      console.warn(`Category not found for ${prod.name}: ${prod.category}`);
      continue;
    }

    await client.query(
      `INSERT INTO public.products (category_id, name, description, image_url, suggested_price_amount, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (category_id, name) DO UPDATE
       SET description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           suggested_price_amount = EXCLUDED.suggested_price_amount,
           is_active = TRUE,
           updated_at = NOW();`,
      [categoryId, prod.name, prod.description, prod.imageUrl, prod.suggestedPrice]
    );
    count++;
  }

  console.log(`✓ Successfully seeded ${count} platform product templates!`);

  // Verify
  const verifyRes = await client.query(`
    SELECT c.name as category, COUNT(p.id) as product_count
    FROM public.categories c
    LEFT JOIN public.products p ON p.category_id = c.id
    GROUP BY c.name
    ORDER BY c.name;
  `);
  console.table(verifyRes.rows);

  await client.end();
}

seedTemplates().catch((err) => {
  console.error('Error seeding templates:', err);
  process.exit(1);
});
