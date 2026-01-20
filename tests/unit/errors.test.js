const { AppError, ValidationError, AuthenticationError } = require('../../src/utils/errors');

describe('Error Classes', () => {
  test('AppError should create error with correct properties', () => {
    const error = new AppError('Test error', 400);
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
  });

  test('ValidationError should extend AppError with 400 status', () => {
    const error = new ValidationError('Validation failed');
    
    expect(error.message).toBe('Validation failed');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
    expect(error instanceof AppError).toBe(true);
  });

  test('AuthenticationError should extend AppError with 401 status', () => {
    const error = new AuthenticationError();
    
    expect(error.message).toBe('Authentication failed');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
    expect(error instanceof AppError).toBe(true);
  });
});