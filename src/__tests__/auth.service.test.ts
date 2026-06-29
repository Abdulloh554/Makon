jest.mock('../modules/auth/auth.repository', () => {
  const mRepo = () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserByEmailWithPassword: jest.fn(),
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
      ;(authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null)
      ;(authRepository.hashPassword as jest.Mock).mockResolvedValue('hashed_password')
      ;(authRepository.createUser as jest.Mock).mockResolvedValue(mockUserResponse.user)

      const result = await authService.register('John', 'Doe', 'john@example.com', 'password123')

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com')
      expect(authRepository.hashPassword).toHaveBeenCalledWith('password123')
      expect(authRepository.createUser).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashed_password',
      })
      expect(result).toHaveProperty('tokens')
      expect(result.tokens).toHaveProperty('accessToken')
      expect(result.tokens).toHaveProperty('refreshToken')
      expect(result.user.firstName).toBe('John')
    })

    it('should throw ConflictError for duplicate email', async () => {
      ;(authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUserResponse.user)

      await expect(
        authService.register('John', 'Doe', 'john@example.com', 'password123')
      ).rejects.toThrow('This email is already registered.')
    })
  })

  describe('login', () => {
    it('should return token pair on valid credentials', async () => {
      ;(authRepository.findUserByEmailWithPassword as jest.Mock).mockResolvedValue({
        user: { ...mockSanitizedUser, role: 'user' },
        passwordHash: 'correct_hash',
      })
      ;(authRepository.verifyPassword as jest.Mock).mockResolvedValue(true)

      const result = await authService.login('john@example.com', 'password123')

      expect(authRepository.findUserByEmailWithPassword).toHaveBeenCalledWith('john@example.com')
      expect(authRepository.verifyPassword).toHaveBeenCalledWith('password123', 'correct_hash')
      expect(result).toHaveProperty('tokens')
      expect(result.tokens).toHaveProperty('accessToken')
    })

    it('should throw NotFoundError for unknown email', async () => {
      ;(authRepository.findUserByEmailWithPassword as jest.Mock).mockResolvedValue(null)

      await expect(
        authService.login('unknown@example.com', 'password123')
      ).rejects.toThrow('User not found with this email.')
    })

    it('should throw UnauthorizedError for wrong password', async () => {
      ;(authRepository.findUserByEmailWithPassword as jest.Mock).mockResolvedValue({
        user: mockSanitizedUser,
        passwordHash: 'correct_hash',
      })
      ;(authRepository.verifyPassword as jest.Mock).mockResolvedValue(false)

      await expect(
        authService.login('john@example.com', 'wrong_password')
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
      ;(authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUserResponse.user)
      ;(authRepository.setResetToken as jest.Mock).mockResolvedValue(undefined)

      const result = await authService.forgotPassword('john@example.com')

      expect(authRepository.setResetToken).toHaveBeenCalled()
      expect(result.message).toBe('If this email is registered, a reset link has been sent.')
    })

    it('should return generic message even for unknown email (security)', async () => {
      ;(authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null)

      const result = await authService.forgotPassword('unknown@example.com')

      expect(result.message).toBe('If this email is registered, a reset link has been sent.')
    })
  })
})
