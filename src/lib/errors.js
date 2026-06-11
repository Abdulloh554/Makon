const { ERROR_CODES } = require('../constants');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || ERROR_CODES.INTERNAL_ERROR;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR);
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_CODES.NOT_FOUND);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Token talab qilinadi. Avval tizimga kiring.') {
    super(message, 401, ERROR_CODES.UNAUTHORIZED);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Sizga ruxsat berilmagan.') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, ERROR_CODES.CONFLICT);
  }
}

module.exports = { AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError };
