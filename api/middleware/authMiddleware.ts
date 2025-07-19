const jwt = require("jsonwebtoken");

// Secret para JWT - en producción esto debe venir de variables de entorno
const TOKEN_SECRET = process.env.TOKEN_SECRET || "mi-secreto-super-seguro-jwt";

/**
 * Middleware simple para verificar JWT
 * Basado en el ejemplo proporcionado
 */
let checkAuth = (req, res, next) => {
  // Obtener el token desde diferentes posibles headers
  let token = req.get("token"); // Formato antiguo

  // Si no hay token, intentar obtenerlo del header Authorization
  if (!token) {
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // Si no hay token, devolver error
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "No token provided",
      message: "Access token is required",
    });
  }

  jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log("ERROR JWT:", err.message);
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        message: err.message,
      });
    }

    // Agregar datos del usuario decodificado al request
    req.userData = decoded.userData;
    req.user = decoded.userData; // Para compatibilidad con otros middlewares

    next();
  });
};

/**
 * Función para generar token JWT simple
 */
const generateToken = (userData) => {
  const payload = {
    userData: userData,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 días
  };

  return jwt.sign(payload, TOKEN_SECRET);
};

/**
 * Middleware opcional - no falla si no hay token
 */
let optionalAuth = (req, res, next) => {
  let token = req.get("token");

  if (!token) {
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // Si no hay token, continuar sin autenticación
  if (!token) {
    return next();
  }

  jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log("Optional auth failed:", err.message);
      // En auth opcional, continuar aunque falle
      return next();
    }

    req.userData = decoded.userData;
    req.user = decoded.userData;
    next();
  });
};

module.exports = {
  checkAuth,
  optionalAuth,
  generateToken,
};
