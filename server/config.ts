// Centralized secure configuration - prevents circular dependencies
// and ensures consistent secret management across the application

// Secure configuration - fails fast in production if secrets are missing
export function getSecureConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Development-only defaults (never used in production)
  const DEV_DEFAULTS = isDevelopment ? {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: '$2b$10$mpcR0UEa9o5taMvrBDXUj.IB5R44buNw7KLxlImhUiSf5gOvIK0Aq', // ShopOwner@2024
    ADMIN_RESET_CODE: 'SHOP2024RESET',
    JWT_SECRET: '8e5f79925d1ee68a96667620ff2f9930260562b36687725db980a7adde696d2b',
    LICENSE_HASH_SALT: 'fde44662d9be69b2ed51fb82867162831c5c7eea266d3d04e148ca596a032e8c',
    DEVICE_HASH_SALT: 'db65c403bede2554e2750c63527b8d8926008a095f1546f14a24d928cc9ced4e',
    GUMROAD_PRODUCT_PERMALINK: 'ihpuq',
    GUMROAD_PRODUCT_ID: 'ihpuq'
  } : {};

  // Required secrets in production
  const requiredSecrets = ['JWT_SECRET', 'ADMIN_PASSWORD_HASH', 'LICENSE_HASH_SALT', 'DEVICE_HASH_SALT'];
  
  if (isProduction) {
    // In production, all secrets must be provided via environment variables
    const missingSecrets = requiredSecrets.filter(key => !process.env[key]);
    if (missingSecrets.length > 0) {
      throw new Error(`CRITICAL SECURITY: Missing required environment variables in production: ${missingSecrets.join(', ')}`);
    }
  }

  // Helper function to get required value or throw error
  const getRequired = (key: string, envValue: string | undefined, defaultValue: string | undefined): string => {
    if (envValue) return envValue;
    if (defaultValue) return defaultValue;
    throw new Error(`Missing required configuration: ${key}`);
  };

  return {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD_HASH: getRequired('ADMIN_PASSWORD_HASH', process.env.ADMIN_PASSWORD_HASH, DEV_DEFAULTS.ADMIN_PASSWORD_HASH),
    ADMIN_RESET_CODE: getRequired('ADMIN_RESET_CODE', process.env.ADMIN_RESET_CODE, DEV_DEFAULTS.ADMIN_RESET_CODE),
    JWT_SECRET: getRequired('JWT_SECRET', process.env.JWT_SECRET, DEV_DEFAULTS.JWT_SECRET),
    LICENSE_HASH_SALT: getRequired('LICENSE_HASH_SALT', process.env.LICENSE_HASH_SALT, DEV_DEFAULTS.LICENSE_HASH_SALT),
    DEVICE_HASH_SALT: getRequired('DEVICE_HASH_SALT', process.env.DEVICE_HASH_SALT, DEV_DEFAULTS.DEVICE_HASH_SALT),
    GUMROAD_PRODUCT_ID: process.env.GUMROAD_PRODUCT_ID || DEV_DEFAULTS.GUMROAD_PRODUCT_ID || 'ihpuq',
    GUMROAD_PRODUCT_PERMALINK: process.env.GUMROAD_PRODUCT_PERMALINK || DEV_DEFAULTS.GUMROAD_PRODUCT_PERMALINK || 'ihpuq'
  };
}