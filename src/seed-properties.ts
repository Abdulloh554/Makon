import fs from 'fs'
import path from 'path'

const PERSIST_FILE = path.resolve(__dirname, '../data/mock-db.json')

function ensureDir() {
  const dir = path.dirname(PERSIST_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function load() {
  ensureDir()
  if (fs.existsSync(PERSIST_FILE)) {
    return JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8'))
  }
  return {}
}

function save(data: Record<string, unknown>) {
  fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2), 'utf-8')
  console.log('Saved to', PERSIST_FILE)
}

// Generate a mock ID
let idCounter = Date.now()
function genId(): string {
  return `mock_${++idCounter}`
}

const data = load()

// ─── 1. Create Users ───
const users: Record<string, unknown> = data['User'] || {}
const sellers: Record<string, unknown> = data['Seller'] || {}
const properties: Record<string, unknown> = data['Property'] || {}

const sellerUserIds: string[] = []

function createUser(firstName: string, lastName: string, phone: string, role: string, email: string) {
  const id = genId()
  const passwordHash = '$2a$10$c4vBVt65paQ/ZPAHOGv3DujvzaxaD/vwLVgfCoVZoDOhQS6tZJ0Ue' // bcrypt('qwerty')
  users[id] = {
    _id: id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email,
    phone,
    password: passwordHash,
    role,
    isActive: true,
    isVerified: true,
    avatar: '/avatars/default.svg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return id
}

// Admin (already exists from ensureAdminUser, but create if not)
const adminId = Object.values(users).find((u: any) => u.role === 'admin')
if (!adminId) {
  createUser('Admin', 'Admin', 'qwerty', 'admin', 'admin@makon.uz')
  console.log('Created admin user')
}

// Seller users
const seller1 = createUser('Akmal', 'Toshmatov', '+998901234567', 'seller', 'akmal@example.com')
const seller2 = createUser('Nilufar', 'Azimova', '+998901234568', 'seller', 'nilufar@example.com')
sellerUserIds.push(seller1, seller2)

console.log(`Created ${sellerUserIds.length} seller users`)

// ─── 2. Create Sellers ───
for (const uid of sellerUserIds) {
  const user: any = users[uid]
  const sellerId = genId()
  sellers[sellerId] = {
    _id: sellerId,
    userId: uid,
    name: user.name,
    phone: user.phone,
    avatar: '/avatars/default.svg',
    rating: 5.0,
    totalListings: 0,
    totalViews: 0,
    verified: true,
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  // Store seller ID for later use
  user._sellerId = sellerId
}

// ─── 3. Create Properties ───
const sampleProps = [
  { title: '2 xonali kvartira, markaz', description: 'Shahar markazida, yangi ta\'mirlangan. Barcha infratuzilma mavjud. Maktab va bog\'chaga yaqin.', price: 950000000, type: 'apartment', dealType: 'sale', status: 'ready', rooms: 2, area: 65, floor: 4, totalFloors: 9, lat: 41.2995, lng: 69.2401, address: 'Toshkent, Yunusobod tumani, 12-mavze', district: 'Yunusobod' },
  { title: '3 xonali hashamatli kvartira', description: 'Yangi qurilish, parkga yaqin. Xavfsizlik, kamera, qo\'riqlanadigan avtoturargoh.', price: 1200000000, type: 'apartment', dealType: 'sale', status: 'ready', rooms: 3, area: 85, floor: 7, totalFloors: 12, lat: 41.3100, lng: 69.2500, address: 'Toshkent, Mirzo Ulug\'bek tumani', district: 'Mirzo Ulug\'bek' },
  { title: 'Hovli (uy) tinch hududda', description: 'Katta hovli, mevali daraxtlar bilan. Tinch hudud. Bog\' va dam olish maskani.', price: 800000000, type: 'house', dealType: 'sale', status: 'half-ready', rooms: 4, area: 150, floor: 1, totalFloors: 1, lat: 41.2800, lng: 69.2200, address: 'Toshkent viloyati, Qibray tumani', district: 'Qibray' },
  { title: 'Premium kottej (basseyn bilan)', description: 'Premium klassdagi kottej. Basseyn va bog\' bor. Xususiy avtoturargoh.', price: 2500000000, type: 'cottage', dealType: 'sale', status: 'ready', rooms: 6, area: 300, floor: 2, totalFloors: 2, lat: 41.3200, lng: 69.2800, address: 'Toshkent, Mirobod tumani', district: 'Mirobod' },
  { title: '1 xonali kvartira (ijara)', description: 'Uyga yaqin, mebellangan xonadon. Uzoq muddatga ijaraga. Wi-Fi mavjud.', price: 5000000, type: 'apartment', dealType: 'rent', status: 'ready', rooms: 1, area: 35, floor: 3, totalFloors: 5, lat: 41.2900, lng: 69.2600, address: 'Toshkent, Chilanzar tumani', district: 'Chilanzar' },
  { title: 'Kvartira kunlik ijaraga', description: 'Shahar markazida kunlik ijara. Wi-Fi, konditsioner, toza choyshab.', price: 300000, type: 'apartment', dealType: 'daily', status: 'ready', rooms: 1, area: 40, floor: 5, totalFloors: 8, lat: 41.3050, lng: 69.2350, address: 'Toshkent, Shayxontohur tumani', district: 'Shayxontohur' },
  { title: 'Yer maydoni (qurilish uchun)', description: 'Tijorat qurilishi uchun yer maydoni. Yo\'lga yaqin, kommunikatsiyalar bor.', price: 1500000000, type: 'land', dealType: 'sale', status: 'land', rooms: 0, area: 500, floor: 0, totalFloors: 0, lat: 41.3400, lng: 69.3000, address: 'Toshkent viloyati, Oqqo\'rg\'on tumani', district: 'Oqqo\'rg\'on' },
  { title: 'Tijorat binosi (markazda)', description: 'Do\'kon va ofislar uchun bino. Markazda joylashgan, yuqori traffik.', price: 5000000000, type: 'commercial', dealType: 'sale', status: 'ready', rooms: 0, area: 200, floor: 2, totalFloors: 3, lat: 41.3150, lng: 69.2450, address: 'Toshkent, Sergeli tumani', district: 'Sergeli' },
  { title: 'Dacha bog\'dorchilikda', description: 'Bog\'dorchilik shirkatidagi uy. Dam olish uchun ajoyib joy, toza havo.', price: 450000000, type: 'dacha', dealType: 'sale', status: 'half-ready', rooms: 3, area: 80, floor: 1, totalFloors: 1, lat: 41.3500, lng: 69.1900, address: 'Toshkent viloyati, Zangiota tumani', district: 'Zangiota' },
  { title: '3 xonali kvartira (uzoq muddat)', description: 'Ta\'mirli, mebellangan kvartira. Uzoq muddatga. Metroga yaqin.', price: 7000000, type: 'apartment', dealType: 'rent', status: 'ready', rooms: 3, area: 70, floor: 2, totalFloors: 5, lat: 41.2950, lng: 69.2150, address: 'Toshkent, Yakkasaroy tumani', district: 'Yakkasaroy' },
  { title: 'Muddatli to\'lov 2 xonali', description: 'Qulay muddatli to\'lov shartida. Boshlang\'ich to\'lov 30%. 24 oy muddat.', price: 600000000, type: 'apartment', dealType: 'installment', status: 'ready', rooms: 2, area: 55, floor: 6, totalFloors: 9, lat: 41.3080, lng: 69.2700, address: 'Toshkent, Olmazor tumani', district: 'Olmazor' },
  { title: '1 xonali kvartira (arzon)', description: 'Arzon, ta\'mir talab qiladigan xonadon. Investitsiya uchun ideal.', price: 350000000, type: 'apartment', dealType: 'sale', status: 'half-ready', rooms: 1, area: 30, floor: 2, totalFloors: 5, lat: 41.2850, lng: 69.2400, address: 'Toshkent, Sergeli tumani', district: 'Sergeli' },
  { title: 'Keng hovli (bog\' bilan)', description: 'Katta yer maydoni, mevali bog\'. Suv va gaz bor.', price: 650000000, type: 'house', dealType: 'sale', status: 'half-ready', rooms: 3, area: 120, floor: 1, totalFloors: 1, lat: 41.2700, lng: 69.1900, address: 'Toshkent viloyati, Zangiota tumani', district: 'Zangiota' },
  { title: 'Kottej (daryo bo\'yida)', description: 'Daryo bo\'yidagi hashamatli kottej. Suv havzasi, sauna.', price: 3500000000, type: 'cottage', dealType: 'sale', status: 'ready', rooms: 5, area: 250, floor: 2, totalFloors: 2, lat: 41.3300, lng: 69.3100, address: 'Toshkent, Bektemir tumani', district: 'Bektemir' },
  { title: 'Ofis ijaraga (markaz)', description: 'Shahar markazidagi ofis. 50 kv.m. Barcha qulayliklar mavjud.', price: 8000000, type: 'commercial', dealType: 'rent', status: 'ready', rooms: 2, area: 50, floor: 3, totalFloors: 6, lat: 41.3020, lng: 69.2450, address: 'Toshkent, Yunusobod tumani', district: 'Yunusobod' },
]

// Alternate between the two sellers
let propIndex = 0
for (const sp of sampleProps) {
  const sellerUser = users[sellerUserIds[propIndex % 2]] as { _sellerId: string } | undefined
  const sellerId = sellerUser?._sellerId
  if (!sellerId) continue
  const propId = genId()
  const now = new Date()
  now.setHours(now.getHours() - propIndex * 2) // stagger creation times
  properties[propId] = {
    _id: propId,
    sellerId,
    title: sp.title,
    description: sp.description,
    price: sp.price,
    type: sp.type,
    dealType: sp.dealType,
    status: sp.status,
    rooms: sp.rooms,
    area: sp.area,
    floor: sp.floor,
    totalFloors: sp.totalFloors,
    location: {
      lat: sp.lat,
      lng: sp.lng,
      address: sp.address,
      district: sp.district,
      city: 'Toshkent',
    },
    images: [],
    views: Math.floor(Math.random() * 50) + 5,
    favorites: [],
    isActive: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  propIndex++
}

// Update seller listings count
for (const sid of Object.keys(sellers)) {
  const seller: any = sellers[sid]
  const count = Object.values(properties).filter((p: any) => p.sellerId === sid).length
  seller.totalListings = count
}

data['User'] = users
data['Seller'] = sellers
data['Property'] = properties

save(data)

console.log(`\nUsers: ${Object.keys(users).length}`)
console.log(`Sellers: ${Object.keys(sellers).length}`)
console.log(`Properties: ${Object.keys(properties).length}`)
console.log('\nSeed complete! Restart the backend server.')
