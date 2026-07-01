import { propertyModel } from './modules/property/property.model'
import { sellerModel } from './modules/seller/seller.model'
import { userModel } from './modules/user/user.model'
import { store } from './database/store'
import { connectDatabase, disconnectDatabase } from './database/connection'
import bcrypt from 'bcryptjs'

function hashId(seed: number): string {
  const chars = 'abcdef0123456789'
  let h = ''
  let n = seed
  for (let i = 0; i < 32; i++) {
    h += chars[n % 16]
    n = Math.floor(n / 16)
    if (n === 0) n = seed + i
  }
  return h
}

const sellers = [
  { name: 'Toshkent Ko\'chmas Mulk', phone: '+998901234501', rating: 4.8 },
  { name: 'Premium Realty', phone: '+998901234502', rating: 4.5 },
  { name: 'Asia Home', phone: '+998901234503', rating: 4.2 },
]

const properties = [
  { title: 'Yangi kvartira, Yunusobod', dealType: 'sale', type: 'apartment', status: 'ready', price: 85000, rooms: 3, area: 75, featured: true },
  { title: 'Kundalik ijaraga hashamatli uy', dealType: 'daily', type: 'house', status: 'ready', price: 150, rooms: 5, area: 200, featured: true },
  { title: 'Uzoq muddatli ijara, Chilonzor', dealType: 'rent', type: 'apartment', status: 'ready', price: 400, rooms: 2, area: 55, featured: true },
  { title: 'Nasiyaga kvartira, Mirzo Ulug\'bek', dealType: 'installment', type: 'apartment', status: 'half-ready', price: 65000, rooms: 3, area: 65, featured: true },
  { title: 'Kottej sotiladi, Qibray', dealType: 'sale', type: 'cottage', status: 'ready', price: 120000, rooms: 6, area: 250, featured: true },
  { title: 'Dacha ijaraga, Chimyon', dealType: 'rent', type: 'dacha', status: 'ready', price: 300, rooms: 4, area: 120, featured: true },
  { title: 'Tijorat binosi, Shahrisabz', dealType: 'sale', type: 'commercial', status: 'half-ready', price: 200000, rooms: 0, area: 500, featured: true },
  { title: 'Yer maydoni sotiladi, Toshkent vil', dealType: 'sale', type: 'land', status: 'land', price: 30000, rooms: 0, area: 1000, featured: true },
  { title: 'Kundalik kvartira, Shahar markazi', dealType: 'daily', type: 'apartment', status: 'ready', price: 80, rooms: 1, area: 35, featured: false },
  { title: 'Nasiyaga hovli, Sergeli', dealType: 'installment', type: 'house', status: 'half-ready', price: 55000, rooms: 4, area: 150, featured: false },
  { title: 'Premium kvartira, City Center', dealType: 'sale', type: 'apartment', status: 'ready', price: 150000, rooms: 4, area: 120, featured: true },
  { title: 'Dam olish uyi, Chimgan', dealType: 'daily', type: 'cottage', status: 'ready', price: 250, rooms: 4, area: 180, featured: true },
]

async function seed() {
  store.useMock = true
  await connectDatabase().catch(() => {})

  const hashedPassword = await bcrypt.hash('qwerty', 10)

  const adminUser = await userModel.create({
    firstName: 'Admin',
    lastName: 'Admin',
    phone: 'qwerty',
    email: 'admin@makon.uz',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    isVerified: true,
  })
  console.log('✅ Admin user yaratildi: qwerty / qwerty')

  const sellerDocs = []
  for (let i = 0; i < sellers.length; i++) {
    const user = await userModel.create({
      firstName: sellers[i].name.split(' ')[0],
      lastName: sellers[i].name.split(' ').slice(1).join(' ') || 'Mulk',
      phone: sellers[i].phone,
      password: '$2a$10$dummy',
    })
    const seller = await sellerModel.create({
      userId: String((user as any)._id || (user as any).id),
      name: sellers[i].name,
      phone: sellers[i].phone,
      rating: sellers[i].rating,
      totalListings: 0,
    })
    sellerDocs.push(seller)
  }

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i]
    const imageHash = hashId(i)
    await propertyModel.create({
      sellerId: String((sellerDocs[i % sellerDocs.length] as any)._id || (sellerDocs[i % sellerDocs.length] as any).id),
      title: p.title,
      description: `${p.title} — ${p.dealType === 'sale' ? 'sotiladi' : p.dealType === 'rent' ? 'ijaraga beriladi' : p.dealType === 'daily' ? 'kundalik ijaraga' : 'nasiyaga'}. ${p.type === 'apartment' ? 'Kvartira' : p.type === 'house' ? 'Hovli' : p.type === 'cottage' ? 'Kottej' : p.type === 'dacha' ? 'Dacha' : p.type === 'commercial' ? 'Tijorat' : 'Yer'} maydoni ${p.area} kv.m. ${p.rooms > 0 ? p.rooms + ' xonali.' : ''}`,
      price: p.price,
      type: p.type,
      dealType: p.dealType,
      status: p.status,
      rooms: p.rooms,
      area: p.area,
      featured: p.featured,
      location: {
        lat: 41.2995 + (i * 0.01),
        lng: 69.2401 + (i * 0.01),
        address: 'Toshkent shahri',
      },
      images: [`/api/uploads/${imageHash}.jpg`],
      isActive: true,
    })
  }

  console.log(`✅ Seed: ${sellerDocs.length} sellers, ${properties.length} properties yaratildi`)
  await disconnectDatabase().catch(() => {})
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
