const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new Error('JWT_SECRET måste vara satt')
}

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://utpost:utpost@localhost:5433/utpost',
  mongoUrl: process.env.MONGO_URL || 'mongodb://utpost:utpost@localhost:27017/utpost?authSource=admin',
  jwtSecret,
  gitSha: process.env.GIT_SHA || 'dev',
  port: 4000,
  uploadDir: './uploads',
  cmsSpaceId: process.env.CONTENTFUL_SPACE_ID ?? '',
  cmsEnvironment: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
  cmsDeliveryToken: process.env.CONTENTFUL_DELIVERY_TOKEN ?? '',
  cmsPreviewToken: process.env.CONTENTFUL_PREVIEW_TOKEN ?? '',
  cmsCacheSeconds: Number(process.env.CMS_CACHE_SECONDS ?? 60),
  cmsWebhookSecret: process.env.CMS_WEBHOOK_SECRET ?? '',
  imageFunctionUrl: process.env.IMAGE_FUNCTION_URL || 'http://localhost:7071/api/process-image',
  imageFunctionKey: process.env.IMAGE_FUNCTION_KEY || '',
}
