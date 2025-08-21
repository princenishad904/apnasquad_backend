import { config } from "../config/index.js";
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    status: statusCode,
    message: err.message || "something went wrong",
    success: false,
    errors: err,
    stack: err.stack || [],
  });
};

export default errorHandler;
