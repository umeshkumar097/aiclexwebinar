export interface AppConfig {
  app: {
    env: string;
    port: number;
    url: string;
    frontendUrl: string;
    swaggerEnabled: boolean;
    rateLimitPerMinute: number;
    corsOrigins: string[];
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    tls: boolean;
  };
  queue: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  jwt: {
    privateKey: string;
    publicKey: string;
    accessExpiry: number;
    refreshExpiryDays: number;
  };
  email: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
  };
  whatsapp: {
    accessToken: string;
    phoneNumberId: string;
    apiVersion: string;
  };
  storage: {
    provider: 'azure' | 'minio';
    azure: {
      accountName: string;
      accountKey: string;
      endpoint: string;
    };
    minio: {
      endpoint: string;
      accessKey: string;
      secretKey: string;
      useSsl: boolean;
    };
  };
  livekit: {
    url: string;
    apiKey: string;
    apiSecret: string;
  };
  turn: {
    url: string;
    tlsUrl: string;
    username: string;
    credential: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
}

export const configuration = (): AppConfig => ({
  app: {
    env: process.env['NODE_ENV'] ?? 'development',
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    url: process.env['APP_URL'] ?? 'http://localhost:3000',
    frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3001',
    swaggerEnabled: process.env['SWAGGER_ENABLED'] === 'true',
    rateLimitPerMinute: parseInt(process.env['RATE_LIMIT_PER_MINUTE'] ?? '300', 10),
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3001').split(','),
  },
  database: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    name: process.env['DB_NAME'] ?? 'zonvo_dev',
    user: process.env['DB_USER'] ?? 'zonvo',
    password: process.env['DB_PASSWORD'] ?? '',
    ssl: process.env['DB_SSL'] === 'true',
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? '',
    db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
    tls: process.env['REDIS_TLS'] === 'true',
  },
  queue: {
    host: process.env['QUEUE_REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['QUEUE_REDIS_PORT'] ?? '6379', 10),
    password: process.env['QUEUE_REDIS_PASSWORD'] ?? '',
    db: parseInt(process.env['QUEUE_REDIS_DB'] ?? '1', 10),
  },
  jwt: {
    privateKey: Buffer.from(process.env['JWT_PRIVATE_KEY'] ?? '', 'base64').toString('utf8'),
    publicKey: Buffer.from(process.env['JWT_PUBLIC_KEY'] ?? '', 'base64').toString('utf8'),
    accessExpiry: parseInt(process.env['JWT_ACCESS_EXPIRY'] ?? '900', 10),
    refreshExpiryDays: parseInt(process.env['JWT_REFRESH_EXPIRY_DAYS'] ?? '30', 10),
  },
  email: {
    apiKey: process.env['RESEND_API_KEY'] ?? '',
    fromEmail: process.env['SMTP_FROM_EMAIL'] ?? process.env['RESEND_FROM_EMAIL'] ?? 'info@aiclexwebinar.in',
    fromName: process.env['SMTP_FROM_NAME'] ?? process.env['RESEND_FROM_NAME'] ?? 'Aiclex Webinar',
    smtpHost: process.env['SMTP_HOST'] ?? 'smtp.hostinger.com',
    smtpPort: parseInt(process.env['SMTP_PORT'] ?? '465', 10),
    smtpUser: process.env['SMTP_USER'] ?? '',
    smtpPassword: process.env['SMTP_PASSWORD'] ?? '',
    smtpSecure: process.env['SMTP_SECURE'] !== 'false', // default true (SSL on port 465)
  },
  whatsapp: {
    accessToken: process.env['META_WA_ACCESS_TOKEN'] ?? '',
    phoneNumberId: process.env['META_WA_PHONE_NUMBER_ID'] ?? '',
    apiVersion: process.env['META_WA_API_VERSION'] ?? 'v20.0',
  },
  storage: {
    provider: (process.env['STORAGE_PROVIDER'] ?? 'minio') as 'azure' | 'minio',
    azure: {
      accountName: process.env['AZURE_STORAGE_ACCOUNT_NAME'] ?? '',
      accountKey: process.env['AZURE_STORAGE_ACCOUNT_KEY'] ?? '',
      endpoint: process.env['AZURE_STORAGE_ENDPOINT'] ?? '',
    },
    minio: {
      endpoint: process.env['MINIO_ENDPOINT'] ?? 'http://localhost:9000',
      accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'zonvo_minio',
      secretKey: process.env['MINIO_SECRET_KEY'] ?? 'zonvo_minio_secret',
      useSsl: process.env['MINIO_USE_SSL'] === 'true',
    },
  },
  livekit: {
    url: process.env['LIVEKIT_URL'] ?? 'ws://localhost:7880',
    apiKey: process.env['LIVEKIT_API_KEY'] ?? 'devkey',
    apiSecret: process.env['LIVEKIT_API_SECRET'] ?? 'devsecret',
  },
  turn: {
    url: process.env['TURN_URL'] ?? '',
    tlsUrl: process.env['TURN_TLS_URL'] ?? '',
    username: process.env['TURN_USERNAME'] ?? '',
    credential: process.env['TURN_CREDENTIAL'] ?? '',
  },
  stripe: {
    secretKey: process.env['STRIPE_SECRET_KEY'] ?? '',
    webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
  },
});

export default configuration;
