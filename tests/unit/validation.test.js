const {
  isValidEmail,
  isValidUsername,
  isValidUrl,
  sanitizeString,
  validatePagination,
  validateRequired,
  isValidFileType,
  isValidFileSize,
} = require('../../src/utils/validation');

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    test('should validate correct usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
      expect(isValidUsername('a'.repeat(50))).toBe(true);
    });

    test('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // too short
      expect(isValidUsername('a'.repeat(51))).toBe(false); // too long
      expect(isValidUsername('user-name')).toBe(false); // invalid character
      expect(isValidUsername('user name')).toBe(false); // space
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername(null)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://subdomain.example.com/path?query=1')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(true); // Actually valid URL
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('just-text')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('should trim and limit string length', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
      expect(sanitizeString('a'.repeat(1001), 1000)).toBe('a'.repeat(1000));
    });

    test('should handle non-string inputs', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('validatePagination', () => {
    test('should return valid pagination with defaults', () => {
      const result = validatePagination();
      expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    test('should handle valid parameters', () => {
      const result = validatePagination({ page: '2', limit: '10' });
      expect(result).toEqual({ page: 2, limit: 10, offset: 10 });
    });

    test('should enforce limits', () => {
      const result = validatePagination({ page: '0', limit: '200' });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });
  });

  describe('validateRequired', () => {
    test('should pass when all required fields present', () => {
      expect(() => {
        validateRequired({ name: 'test', email: 'test@example.com' }, ['name', 'email']);
      }).not.toThrow();
    });

    test('should throw when required fields missing', () => {
      expect(() => {
        validateRequired({ name: 'test' }, ['name', 'email']);
      }).toThrow('Missing required fields: email');
    });
  });

  describe('isValidFileType', () => {
    test('should validate allowed file types', () => {
      expect(isValidFileType('image/jpeg', ['image/jpeg', 'image/png'])).toBe(true);
      expect(isValidFileType('image/png', ['image/jpeg', 'image/png'])).toBe(true);
    });

    test('should reject disallowed file types', () => {
      expect(isValidFileType('text/plain', ['image/jpeg', 'image/png'])).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    test('should validate file size limits', () => {
      expect(isValidFileSize(1024, 2048)).toBe(true);
      expect(isValidFileSize(2048, 2048)).toBe(true);
    });

    test('should reject oversized files', () => {
      expect(isValidFileSize(3000, 2048)).toBe(false);
    });
  });
});