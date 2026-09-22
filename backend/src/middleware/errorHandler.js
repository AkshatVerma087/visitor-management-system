const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Only leak message in development, or if it's an operational error in production
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      error: {
        statusCode: err.statusCode,
        status: err.status,
        message: err.message,
        stack: err.stack
      }
    });
  } else {
    // Production Mode
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      res.status(err.statusCode).json({
        success: false,
        error: {
          statusCode: err.statusCode,
          message: err.message
        }
      });
    } else {
      // Programming or other unknown error: don't leak error details
      console.error('ERROR 💥', err);
      res.status(500).json({
        success: false,
        error: {
          statusCode: 500,
          message: 'Internal Server Error'
        }
      });
    }
  }
};

module.exports = errorHandler;
