jest.mock('../modules/auth/auth.repository', () => {
  const mRepo = () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserByEmailWithPassword: jest.fn(),
    findUserByPhone: jest.fn(),
    findUserByPhoneWithPassword: jest.fn(),
    findUserById: jest.fn(),
    createUser: jest.fn(),
    setResetToken: jest.fn(),
    blacklistRefreshToken: jest.fn(),
    isTokenBlacklisted: jest.fn(),
    findByResetToken: jest.fn(),
    updatePassword: jest.fn(),
  })
  return { authRepository: mRepo() }
})

jest.mock('../utils/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    wrap: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  },
}))

import { authRepository } from '../modules/auth/auth.repository'
import { authService } from '../modules/auth/auth.service'

const mockUserResponse = {
  user: {
    id: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    username: 'testuser',
    phone: '+998901234567',
    email: 'john@example.com',
    avatar: '',
    role: 'user' as const,
    isVerified: false,
  },
}

const mockSanitizedUser = {
  id: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  name: 'John Doe',
  username: 'testuser',
  phone: '+998901234567',
  email: 'john@example.com',
  avatar: '',
  role: 'user' as const,
  isVerified: false,
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should create user and return token pair', async () => {
      ;(authRepository.findUserByPhone as jest.Mock).mockResolvedValue(null)
      ;(authRepository.hashPassword as jest.Mock).mockResolvedValue('hashed_password')
      ;(authRepository.createUser as jest.Mock).mockResolvedValue(mockUserResponse.user)

      const result = await authService.register('testuser', '+998901234567', 'password123')

      expect(authRepository.findUserByPhone).toHaveBeenCalledWith('+998901234567')
      expect(authRepository.hashPassword).toHaveBeenCalledWith('password123')
      expect(authRepository.createUser).toHaveBeenCalledWith({
        username: 'testuser',
        phone: '+998901234567',
        password: 'hashed_password',
      })
      expect(result).toHaveProperty('tokens')
      expect(result.tokens).toHaveProperty('accessToken')
      expect(result.tokens).toHaveProperty('refreshToken')
      expect(result.user.username).toBe('testuser')
    })

    it('should throw ConflictError for duplicate phone', async () => {
      ;(authRepository.findUserByPhone as jest.Mock).mockResolvedValue(mockUserResponse.user)

      await expect(
        authService.register('testuser', '+998901234567', 'password123')
      ).rejects.toThrow('This phone is already registered.')
    })
  })

  describe('login', () => {
    it('should return token pair on valid credentials', async () => {
      ;(authRepository.findUserByPhoneWithPassword as jest.Mock).mockResolvedValue({
        user: { ...mockSanitizedUser, role: 'user' },
        passwordHash: 'correct_hash',
      })
      ;(authRepository.verifyPassword as jest.Mock).mockResolvedValue(true)

      const result = await authService.login('+998901234567', 'password123')

      expect(authRepository.findUserByPhoneWithPassword).toHaveBeenCalledWith('+998901234567')
      expect(authRepository.verifyPassword).toHaveBeenCalledWith('password123', 'correct_hash')
      expect(result).toHaveProperty('tokens')
      expect(result.tokens).toHaveProperty('accessToken')
    })

    it('should throw NotFoundError for unknown phone', async () => {
      ;(authRepository.findUserByPhoneWithPassword as jest.Mock).mockResolvedValue(null)

      await expect(
        authService.login('+998900000000', 'password123')
      ).rejects.toThrow('User not found with this phone.')
    })

    it('should throw UnauthorizedError for wrong password', async () => {
      ;(authRepository.findUserByPhoneWithPassword as jest.Mock).mockResolvedValue({
        user: mockSanitizedUser,
        passwordHash: 'correct_hash',
      })
      ;(authRepository.verifyPassword as jest.Mock).mockResolvedValue(false)

      await expect(
        authService.login('+998901234567', 'wrong_password')
      ).rejects.toThrow('Invalid password.')
    })
  })

  describe('me', () => {
    it('should return user by ID', async () => {
      ;(authRepository.findUserById as jest.Mock).mockResolvedValue(mockSanitizedUser)

      const result = await authService.me('user123')

      expect(authRepository.findUserById).toHaveBeenCalledWith('user123')
      expect(result.firstName).toBe('John')
    })

    it('should throw NotFoundError for unknown user', async () => {
      ;(authRepository.findUserById as jest.Mock).mockResolvedValue(null)

      await expect(authService.me('nonexistent')).rejects.toThrow('User not found.')
    })
  })

  describe('forgotPassword', () => {
    it('should set reset token for existing user', async () => {
      ;(authRepository.findUserByPhone as jest.Mock).mockResolvedValue(mockUserResponse.user)
      ;(authRepository.setResetToken as jest.Mock).mockResolvedValue(undefined)

      const result = await authService.forgotPassword('+998901234567')

      expect(authRepository.setResetToken).toHaveBeenCalled()
      expect(result.message).toBe('If this phone is registered, a reset link has been sent.')
    })

    it('should return generic message even for unknown phone (security)', async () => {
      ;(authRepository.findUserByPhone as jest.Mock).mockResolvedValue(null)

      const result = await authService.forgotPassword('+998900000000')

      expect(result.message).toBe('If this phone is registered, a reset link has been sent.')
    })
  })
})
