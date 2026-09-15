export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
}

export const mockCategories: MockCategory[] = [
  { id: 'cat-groceries', name: 'Groceries', slug: 'groceries', icon: 'ShoppingBasket', description: 'Rice, beans, garri, oil, sugar, salt, flour and more' },
  { id: 'cat-food-meals', name: 'Food & Meals', slug: 'food-meals', icon: 'UtensilsCrossed', description: 'Jollof rice, fried rice, chicken, shawarma, burgers, pizza' },
  { id: 'cat-fruits-veg', name: 'Fruits & Vegetables', slug: 'fruits-vegetables', icon: 'Apple', description: 'Tomatoes, onions, peppers, potatoes, bananas, oranges' },
  { id: 'cat-drinks', name: 'Drinks', slug: 'drinks', icon: 'CupSoda', description: 'Soft drinks, juice, water and beverages' },
  { id: 'cat-household', name: 'Household', slug: 'household', icon: 'SprayCan', description: 'Detergent, soap, tissue, bleach and cleaning supplies' },
  { id: 'cat-personal-care', name: 'Personal Care', slug: 'personal-care', icon: 'Sparkles', description: 'Body lotion, bath soap, shampoo, deodorant and more' },
  { id: 'cat-electronics', name: 'Electronics & Accessories', slug: 'electronics', icon: 'Smartphone', description: 'Chargers, cables, earphones, power banks and accessories' },
  { id: 'cat-pharmacy', name: 'Pharmacy & Wellness', slug: 'pharmacy', icon: 'Pill', description: 'Vitamins and general wellness products' },
  { id: 'cat-stationery', name: 'Stationery & School', slug: 'stationery', icon: 'Pencil', description: 'Notebooks, pens, files, calculators, backpacks and paper' },
];
