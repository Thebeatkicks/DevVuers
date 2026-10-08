const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new Error('JWT_SECRET måste vara satt')
}

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://utpost:utpost@localhost:5433/utpost',
  mongoUrl: process.env.MONGO_URL || 'mongodb://utpost:utpost@localhost:27017/utpost?authSource=admin',
  jwtSecret,
  port: 4000,
  uploadDir: './uploads',
}
