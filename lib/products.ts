// lib/products.ts
// Single source of truth for the catalogue. Both /products (grid) and
// /products/[slug] (detail page) import from here so they never drift.

export const CATEGORIES = ['All', 'Gadgets', 'Appliances', 'Furniture'] as const
export type Category = Exclude<typeof CATEGORIES[number], 'All'>

export type ProductColor = { name: string; hex: string }
export type ProductSpec = { label: string; mo: string; priceDelta: number } // priceDelta added to base price

export type Product = {
  slug: string
  src: string
  gallery?: string[]
  tag: Category
  title: string
  price: number
  mo: string
  popular: boolean
  description: string
  colors?: ProductColor[]
  specs?: ProductSpec[] // e.g. storage/memory tiers — first one is the default
}

// FIX: tags match CATEGORIES exactly (title case) — no case-folding needed
export const PRODUCTS: Product[] = [
  // ---------------- Gadgets ----------------
  {
    slug: 'samsung-galaxy-a55-5g',
    src: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800',
    tag: 'Gadgets',
    title: 'Samsung Galaxy A55 5G',
    price: 18999,
    mo: '₱1,650/mo',
    popular: true,
    description: 'A mid-range 5G phone with a bright AMOLED display and all-day battery life.',
colors: [
      { name: 'Awesome Navy',  hex: '#1F2A44' },
      { name: 'Awesome Lilac', hex: '#B7A7D6' },
      { name: 'Awesome Lemon', hex: '#E9DD8F' },
    ],
    specs: [
      { label: '128GB', mo: '₱1,650/mo', priceDelta: 0 },
      { label: '256GB', mo: '₱1,890/mo', priceDelta: 2500 },
    ],
  },
  {
    slug: 'macbook-air-m2',
    src: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800',
    tag: 'Gadgets',
    title: 'MacBook Air M2',
    price: 58999,
    mo: '₱4,850/mo',
    popular: true,
    description: 'Thin, silent, and fast enough for everyday work, school, and creative projects.',
colors: [
      { name: 'Midnight',   hex: '#1E2530' },
      { name: 'Starlight',  hex: '#F0E6D6' },
      { name: 'Space Gray', hex: '#5B5C5E' },
      { name: 'Silver',     hex: '#E5E6E8' },
    ],
    specs: [
      { label: '8GB / 256GB', mo: '₱4,850/mo', priceDelta: 0 },
      { label: '8GB / 512GB', mo: '₱5,420/mo', priceDelta: 6000 },
      { label: '16GB / 512GB', mo: '₱5,990/mo', priceDelta: 12000 },
    ],
  },
  {
    slug: 'ipad-10th-gen',
    src: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?q=80&w=800',
    tag: 'Gadgets',
    title: 'iPad 10th Gen',
    price: 21999,
    mo: '₱1,920/mo',
    popular: false,
    description: 'A do-it-all tablet for streaming, note-taking, and light editing on the go.',
    colors: [
      { name: 'Blue', hex: '#7FA9C9' },
      { name: 'Pink', hex: '#E9C4CE' },
      { name: 'Yellow', hex: '#F0D97E' },
      { name: 'Silver', hex: '#E5E6E8' },
    ],
    specs: [
      { label: '64GB, Wi-Fi', mo: '₱1,920/mo', priceDelta: 0 },
      { label: '256GB, Wi-Fi', mo: '₱2,340/mo', priceDelta: 5000 },
    ],
  },
  {
    slug: 'sony-wh-1000xm5',
    src: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=800',
    tag: 'Gadgets',
    title: 'Sony WH-1000XM5',
    price: 17999,
    mo: '₱1,570/mo',
    popular: false,
    description: 'Industry-leading noise cancelling headphones for calls, flights, and focus time.',
    colors: [
      { name: 'Black', hex: '#1B1B1B' },
      { name: 'Platinum Silver', hex: '#CFCBC2' },
    ],
  },
  {
    slug: 'iphone-15',
    src: 'https://images.unsplash.com/photo-1592286927505-1def25115558?q=80&w=800',
    tag: 'Gadgets',
    title: 'iPhone 15',
    price: 47999,
    mo: '₱4,180/mo',
    popular: true,
    description: 'Dynamic Island, a 48MP main camera, and USB-C in Apple’s standard flagship.',
colors: [
      { name: 'Blue',  hex: '#A7C3D9' },
      { name: 'Pink',  hex: '#F1D2D8' },
      { name: 'Black', hex: '#2B2B2E' },
      { name: 'Green', hex: '#B9C6AE' },
    ],
    specs: [
      { label: '128GB', mo: '₱4,180/mo', priceDelta: 0 },
      { label: '256GB', mo: '₱4,650/mo', priceDelta: 6000 },
    ],
  },
  {
    slug: 'nintendo-switch-oled',
    src: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?q=80&w=800',
    tag: 'Gadgets',
    title: 'Nintendo Switch OLED',
    price: 19999,
    mo: '₱1,740/mo',
    popular: false,
    description: 'A vivid 7-inch OLED screen makes handheld play sharper than ever.',
    colors: [
      { name: 'White', hex: '#F2F2F0' },
      { name: 'Neon', hex: '#E8425A' },
    ],
  },
  {
    slug: 'dji-mini-4k',
    src: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800',
    tag: 'Gadgets',
    title: 'DJI Mini 4K Drone',
    price: 32999,
    mo: '₱2,870/mo',
    popular: false,
    description: 'A featherweight beginner drone that shoots crisp 4K video.',
  },

  // ---------------- Appliances ----------------
  {
    slug: '2-door-refrigerator',
    src: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=800',
    tag: 'Appliances',
    title: '2-Door Refrigerator',
    price: 24999,
    mo: '₱2,180/mo',
    popular: true,
    description: 'A no-frost 2-door fridge with enough capacity for a family of four.',
    colors: [
      { name: 'Silver', hex: '#D8D9DA' },
      { name: 'Black', hex: '#232323' },
    ],
    specs: [
      { label: '7.0 cu.ft.', mo: '₱2,180/mo', priceDelta: 0 },
      { label: '9.0 cu.ft.', mo: '₱2,590/mo', priceDelta: 5000 },
    ],
  },
  {
    slug: 'front-load-washing-machine',
    src: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=800',
    tag: 'Appliances',
    title: 'Front-Load Washing Machine',
    price: 27999,
    mo: '₱2,440/mo',
    popular: false,
    description: 'Inverter-driven washing that’s gentler on fabric and quieter on your ears.',
    specs: [
      { label: '8kg', mo: '₱2,440/mo', priceDelta: 0 },
      { label: '10kg', mo: '₱2,890/mo', priceDelta: 5500 },
    ],
  },
  {
    slug: 'split-type-air-conditioner',
    src: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=800',
    tag: 'Appliances',
    title: 'Split-Type Air Conditioner',
    price: 32999,
    mo: '₱2,870/mo',
    popular: false,
    description: 'A 1.0HP inverter split-type unit built for small to medium bedrooms.',
  },
  {
    slug: 'microwave-oven-convection',
    src: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=800',
    tag: 'Appliances',
    title: 'Convection Microwave Oven',
    price: 8999,
    mo: '₱790/mo',
    popular: false,
    description: 'Grill, bake, and reheat in one countertop unit.',
  },
  {
    slug: '55-inch-4k-smart-tv',
    src: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=800',
    tag: 'Appliances',
    title: '55" 4K Smart TV',
    price: 26999,
    mo: '₱2,350/mo',
    popular: true,
    description: 'A crisp 4K HDR panel with built-in streaming apps, no extra box needed.',
    specs: [
      { label: '55"', mo: '₱2,350/mo', priceDelta: 0 },
      { label: '65"', mo: '₱3,190/mo', priceDelta: 9500 },
    ],
  },
  {
    slug: 'stand-mixer',
    src: 'https://images.unsplash.com/photo-1578643463396-0997cb5e2f7d?q=80&w=800',
    tag: 'Appliances',
    title: 'Stand Mixer, 5L',
    price: 12999,
    mo: '₱1,130/mo',
    popular: false,
    description: 'A kitchen workhorse for dough, batter, and everything in between.',
    colors: [
      { name: 'Cream', hex: '#F1E6D2' },
      { name: 'Red', hex: '#B5342F' },
      { name: 'Black', hex: '#232323' },
    ],
  },

  // ---------------- Furniture ----------------
  {
    slug: '3-seater-sofa',
    src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800',
    tag: 'Furniture',
    title: '3-Seater Sofa',
    price: 22999,
    mo: '₱2,000/mo',
    popular: false,
    description: 'A roomy fabric sofa built for movie nights and lazy Sundays.',
    colors: [
      { name: 'Charcoal', hex: '#3B3B3B' },
      { name: 'Sand', hex: '#D9CBB2' },
      { name: 'Sage', hex: '#A9B7A1' },
    ],
  },
  {
    slug: 'queen-bed-frame-mattress',
    src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800',
    tag: 'Furniture',
    title: 'Queen Bed Frame + Mattress',
    price: 26999,
    mo: '₱2,350/mo',
    popular: true,
    description: 'A solid wood frame paired with a medium-firm mattress, ready to sleep on.',
  },
  {
    slug: 'work-from-home-desk',
    src: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=800',
    tag: 'Furniture',
    title: 'Work-From-Home Desk',
    price: 9999,
    mo: '₱870/mo',
    popular: false,
    description: 'A 120cm desk with cable management, sized for a small home office.',
    colors: [
      { name: 'Oak', hex: '#C7A374' },
      { name: 'Walnut', hex: '#5B3A29' },
      { name: 'White', hex: '#F2F1EC' },
    ],
  },
  {
    slug: 'ergonomic-office-chair',
    src: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?q=80&w=800',
    tag: 'Furniture',
    title: 'Ergonomic Office Chair',
    price: 13999,
    mo: '₱1,220/mo',
    popular: true,
    description: 'Lumbar support and a reclining back for long work-from-home days.',
    colors: [
      { name: 'Black', hex: '#232323' },
      { name: 'Gray', hex: '#8A8A8A' },
    ],
  },
  {
    slug: '4-door-wardrobe',
    src: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800',
    tag: 'Furniture',
    title: '4-Door Wardrobe',
    price: 17999,
    mo: '₱1,570/mo',
    popular: false,
    description: 'Generous hanging space plus shelving, built to fit most bedrooms.',
  },
  {
    slug: 'dining-set-4-seater',
    src: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?q=80&w=800',
    tag: 'Furniture',
    title: '4-Seater Dining Set',
    price: 15999,
    mo: '₱1,390/mo',
    popular: false,
    description: 'A compact table and four chairs, sized for apartments and condos.',
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

export function getRelatedProducts(product: Product, limit = 3): Product[] {
  return PRODUCTS.filter((p) => p.tag === product.tag && p.slug !== product.slug).slice(0, limit)
}