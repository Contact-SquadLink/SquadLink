export interface MockBusiness {
  id: string;
  name: string;
  area: string;
  rating: number;
  verified: boolean;
}

export const mockBusinesses: MockBusiness[] = [
  { id: 'biz-1', name: 'Bauchi Fresh Mart', area: 'Wunti', rating: 4.6, verified: true },
  { id: 'biz-2', name: 'Yam Hausa Kitchen', area: 'Gidan Mai', rating: 4.4, verified: true },
  { id: 'biz-3', name: 'City Electronics Hub', area: 'Gidan Dan Fili', rating: 4.2, verified: true },
  { id: 'biz-4', name: 'Everyday Supermarket', area: 'Adamu Juma', rating: 4.5, verified: true },
  { id: 'biz-5', name: 'CarePlus Pharmacy', area: 'Ran Road', rating: 4.7, verified: true },
  { id: 'biz-6', name: 'Smart Supplies Store', area: 'Yelwa', rating: 4.1, verified: false },
  { id: 'biz-7', name: 'Fresh Harvest Farms', area: 'Miri', rating: 4.3, verified: true },
  { id: 'biz-8', name: 'Quick Bite Shawarma', area: 'Ahmadu Bello Way', rating: 4.5, verified: true },
];
