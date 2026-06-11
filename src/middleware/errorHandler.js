const config = require('../config');
const logger = require('../lib/logger');
const { AppError } = require('../lib/errors');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    logger.warn(err.message, { code: err.code, statusCode: err.statusCode, details: err.details });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details && { details: err.details }),
    });
  }

  logger.error(err.message, { stack: err.stack });

  res.status(err.status || 500).json({
    error: config.isDev ? err.message : 'Something went wrong',
    code: 'INTERNAL_ERROR',
    ...(config.isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
