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
  imageFunctionUrl: process.env.IMAGE_FUNCTION_URL || 'http://localhost:7071/api/process-image',
  imageFunctionKey: process.env.IMAGE_FUNCTION_KEY || '',
}
