import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/controllers";

// Interfaces para TypeScript
interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface JWTPayload {
  userData: UserData;
  iat: number;
  exp: number;
}

interface ExtendedAuthenticatedRequest extends AuthenticatedRequest {
  userData?: UserData;
}

// Secret para JWT - en producción esto debe venir de variables de entorno
const TOKEN_SECRET: string =
  process.env.TOKEN_SECRET || "mi-secreto-super-seguro-jwt";

/**
 * Middleware simple para verificar JWT
 * Basado en el ejemplo proporcionado
 */
const checkAuth = (
  req: ExtendedAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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
    res.status(401).json({
      success: false,
      error: "No token provided",
      message: "Access token is required",
    });
    return;
  }

  jwt.verify(
    token,
    TOKEN_SECRET,
    (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        console.log("ERROR JWT:", err.message);
        res.status(401).json({
          success: false,
          error: "Invalid token",
          message: err.message,
        });
        return;
      }

      req.userData = decoded.userData;

      req.user = {
        id: decoded.userData.id,
        email: decoded.userData.email,
        username: `${decoded.userData.firstName} ${decoded.userData.lastName}`,
      };

      next();
    }
  );
};

/**
 * Función para generar token JWT simple
 */
const generateToken = (userData: UserData): string => {
  const payload: JWTPayload = {
    userData: userData,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 días
  };

  return jwt.sign(payload, TOKEN_SECRET);
};

/**
 * Middleware opcional - no falla si no hay token
 */
const optionalAuth = (
  req: ExtendedAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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

  jwt.verify(
    token,
    TOKEN_SECRET,
    (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        console.log("Optional auth failed:", err.message);
        // En auth opcional, continuar aunque falle
        return next();
      }

      req.userData = decoded.userData;
      req.user = {
        id: decoded.userData.id,
        email: decoded.userData.email,
        username: `${decoded.userData.firstName} ${decoded.userData.lastName}`,
      };
      next();
    }
  );
};

// Exportar usando ES modules
export { checkAuth, optionalAuth, generateToken };
export type { UserData, ExtendedAuthenticatedRequest, JWTPayload };
