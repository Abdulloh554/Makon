import bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth'

jest.mock('../modules/user/user.model')
jest.mock('../modules/seller/seller.model')
jest.mock('../modules/property/property.model')
jest.mock('../modules/message/message.model')

import { userModel } from '../modules/user/user.model'
import { sellerModel } from '../modules/seller/seller.model'
import * as authService from '../modules/auth/auth.service'

const mockUser = {
  _id: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+998901234567',
  password: 'hashed_password',
  role: 'seller',
  toJSON: () => ({
    _id: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+998901234567',
    role: 'seller',
  }),
}

const mockSeller = {
  _id: 'seller123',
  userId: 'user123',
  name: 'John Doe',
  phone: '+998901234567',
  save: jest.fn(),
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should create user and seller on registration', async () => {
      ;(userModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(userModel.create as jest.Mock).mockResolvedValue(mockUser)
      ;(sellerModel.create as jest.Mock).mockResolvedValue(mockSeller)

      const result = await authService.register('John', 'Doe', '+998901234567', 'password123')

      expect(userModel.findOne).toHaveBeenCalledWith({ phone: '+998901234567' })
      expect(userModel.create).toHaveBeenCalled()
      expect(sellerModel.create).toHaveBeenCalled()
      expect(result).toHaveProperty('token')
      expect(result.user.firstName).toBe('John')
    })

    it('should throw ConflictError for duplicate phone', async () => {
      ;(userModel.findOne as jest.Mock).mockResolvedValue(mockUser)

      await expect(
        authService.register('John', 'Doe', '+998901234567', 'password123')
      ).rejects.toThrow('Ushbu telefon raqami allaqachon ro\'yxatdan o\'tgan.')
    })
  })

  describe('login', () => {
    it('should return token on valid credentials', async () => {
      const userWithPassword = {
        ...mockUser,
        password: await bcrypt.hash('password123', 10),
      }
      ;(userModel.findOne as jest.Mock).mockResolvedValue(userWithPassword)

      const result = await authService.login('+998901234567', 'password123')

      expect(result).toHaveProperty('token')
      expect(result.user.firstName).toBe('John')
    })

    it('should throw NotFoundError for unknown phone', async () => {
      ;(userModel.findOne as jest.Mock).mockResolvedValue(null)

      await expect(
        authService.login('+998900000000', 'password123')
      ).rejects.toThrow('Foydalanuvchi topilmadi.')
    })

    it('should throw UnauthorizedError for wrong password', async () => {
      const userWithPassword = {
        ...mockUser,
        password: await bcrypt.hash('correct_password', 10),
      }
      ;(userModel.findOne as jest.Mock).mockResolvedValue(userWithPassword)

      await expect(
        authService.login('+998901234567', 'wrong_password')
      ).rejects.toThrow('Noto\'g\'ri parol.')
    })
  })

  describe('me', () => {
    it('should return user by ID', async () => {
      ;(userModel.findById as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.me('user123')

      expect(userModel.findById).toHaveBeenCalledWith('user123')
      expect(result.firstName).toBe('John')
    })

    it('should throw NotFoundError for unknown user', async () => {
      ;(userModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(authService.me('nonexistent')).rejects.toThrow('Foydalanuvchi topilmadi.')
    })
  })

  describe('forgotPassword', () => {
    it('should set reset token for existing user', async () => {
      const updateMock = jest.fn().mockResolvedValue({})
      ;(userModel.findOne as jest.Mock).mockResolvedValue(mockUser)
      ;(userModel.findOneAndUpdate as jest.Mock).mockImplementation(updateMock)

      const result = await authService.forgotPassword('+998901234567')

      expect(result.message).toContain('kod yuborildi')
    })

    it('should return generic message even for unknown phone (security)', async () => {
      ;(userModel.findOne as jest.Mock).mockResolvedValue(null)

      const result = await authService.forgotPassword('+998900000000')

      expect(result.message).toContain('kod yuborildi')
    })
  })
})
