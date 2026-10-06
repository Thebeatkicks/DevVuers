/* TODO: flytta ut det här nån gång. /marcus 2021-03-11
export const config = {
  databaseUrl: 'postgres://utpost:utpost@localhost:5433/utpost',
  jwtSecret: 'utpost-super-secret-2021',
  port: 4000,
  uploadDir: './uploads',
};

*/

//lösningen så testet blir grönt.
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new Error('JWT_SECRET måste vara satt')
}

export const config = {
  databaseUrl: 'postgres://utpost:utpost@localhost:5433/utpost',
  jwtSecret,
  port: 4000,
  uploadDir: './uploads',
} 