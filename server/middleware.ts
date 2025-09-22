import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { 
    id: string; 
    username: string;
    type?: 'admin' | 'device';
    license_key?: string;
    device_id?: string;
    activation_id?: string;
  };
}

// Import the centralized config function - prevents circular dependencies
import { getSecureConfig } from "./config";

// Helper function to get JWT secret at runtime - uses centralized config
function getJwtSecret(): string {
  const config = getSecureConfig();
  return config.JWT_SECRET;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const jwtSecret = getJwtSecret();
    jwt.verify(token, jwtSecret, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: 'Authentication system not properly configured' });
  }
};

// Role-based authentication middleware - Admin tokens only
export const authenticateAdminToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Admin access token required' });
  }

  try {
    const jwtSecret = getJwtSecret();
    jwt.verify(token, jwtSecret, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired admin token' });
      }
      
      // Check if this is an admin token (contains username field)
      if (!user.username || user.license_key) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // Mark as admin type for clarity
      req.user = { ...user, type: 'admin' };
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: 'Authentication system not properly configured' });
  }
};

// Device-based authentication middleware - Device tokens only
export const authenticateDeviceToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Device access token required' });
  }

  try {
    const jwtSecret = getJwtSecret();
    jwt.verify(token, jwtSecret, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired device token' });
      }
      
      // Check if this is a device token (contains license_key and device_id)
      if (!user.license_key || !user.device_id) {
        return res.status(403).json({ message: 'Device access required' });
      }
      
      // Mark as device type for clarity
      req.user = { ...user, type: 'device' };
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: 'Authentication system not properly configured' });
  }
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (err.message === 'Product not found') {
    return res.status(404).json({ message: err.message });
  }
  
  if (err.message === 'Insufficient stock') {
    return res.status(400).json({ message: err.message });
  }
  
  res.status(500).json({ message: 'Internal server error' });
};
