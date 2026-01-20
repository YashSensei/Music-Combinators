const { AppError } = require('../utils/errors');

const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  next(new AppError(message, 404));
};

module.exports = { notFoundHandler };
