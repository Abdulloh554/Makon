const PROPERTY_TYPES = ['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land'];
const DEAL_TYPES = ['daily', 'sale', 'rent', 'installment'];
const PROPERTY_STATUSES = ['ready', 'half-ready', 'land', 'sold'];
const USER_ROLES = ['user', 'seller', 'admin'];
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
};

module.exports = { PROPERTY_TYPES, DEAL_TYPES, PROPERTY_STATUSES, USER_ROLES, ERROR_CODES };
