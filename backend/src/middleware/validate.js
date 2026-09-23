const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Middleware to validate incoming request bodies against a Zod schema.
 * Sends a 400 Bad Request with formatted error details if validation fails.
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a clean string (e.g., "email: Invalid email, password: Too short")
        const issues = error.issues || error.errors || [];
        const formattedErrors = issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return next(new AppError(formattedErrors, 400));
      }
      next(error);
    }
  };
};

module.exports = validate;
