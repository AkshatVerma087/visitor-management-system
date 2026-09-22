const { ZodError } = require('zod');

/**
 * Middleware to validate incoming request bodies against a Zod schema.
 * Sends a 400 Bad Request with formatted error details if validation fails.
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a clean string (e.g., "email: Invalid email, password: Too short")
        const formattedErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({ error: formattedErrors });
      }
      next(error);
    }
  };
};

module.exports = validate;
