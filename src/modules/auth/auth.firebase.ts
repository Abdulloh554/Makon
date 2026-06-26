import { verifyFirebaseToken } from '../../services/firebase'
import { userModel } from '../user/user.model'
import { sellerModel } from '../seller/seller.model'

export async function firebaseLogin(idToken: string) {
  const decoded = await verifyFirebaseToken(idToken)

  const email = decoded.email || ''
  const firebaseUid = decoded.uid
  const name = decoded.name || email.split('@')[0] || 'User'
  const avatar = decoded.picture || '/avatars/user.svg'

  let user = await userModel.findOne({
    $or: [
      { provider: 'firebase', email },
      { provider: 'firebase', firebaseUid },
    ],
  })

  if (user) {
    await userModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      name,
      avatar,
      email,
    })
  } else {
    user = await userModel.create({
      provider: 'firebase',
      firebaseUid,
      email,
      name,
      avatar,
      role: 'user',
      isVerified: !!decoded.email_verified,
      isActive: true,
    })

    const userId = String(user._id ?? user.id ?? '')
    await sellerModel.create({
      userId,
      name,
      phone: '',
      avatar,
      rating: 5.0,
      totalListings: 0,
      joinedAt: new Date(),
    })
  }

  const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user
  delete userJson.password
  return { user: userJson }
}
