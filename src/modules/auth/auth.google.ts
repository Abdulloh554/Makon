import { OAuth2Client } from 'google-auth-library'
import { userModel } from '../user/user.model'
import { sellerModel } from '../seller/seller.model'
import { config } from '../../config'

const GOOGLE_CLIENT_ID = config.google.clientId

let googleClient: OAuth2Client | null = null

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
  }
  return googleClient
}

export async function googleLogin(idToken: string) {
  const client = getGoogleClient()
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload || !payload.email) {
    throw new Error('Google tokenidan email olish imkonsiz.')
  }

  const googleId = payload.sub
  const email = payload.email
  const name = payload.name || email.split('@')[0]
  const avatar = payload.picture || '/avatars/user.svg'

  let user = await userModel.findOne({
    $or: [
      { provider: 'google', email },
      { provider: 'google', googleId },
    ],
  })

  if (user) {
    await userModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      name,
      avatar,
    })
  } else {
    user = await userModel.create({
      provider: 'google',
      googleId,
      email,
      name,
      avatar,
      role: 'user',
      isVerified: true,
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

  const userJson = user.toJSON()
  delete userJson.password
  return { user: userJson }
}
