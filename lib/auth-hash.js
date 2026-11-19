// Password hashing without the Next.js cookie helpers, so scripts can use it outside the web server.
import bcrypt from 'bcryptjs';

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const checkPassword = (plain, hash) => bcrypt.compare(plain, hash);
