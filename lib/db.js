// MySQL connection pool (the system of record). Reused across hot reloads.
import mysql from 'mysql2/promise';
import { requireEnv } from './env.js';

export function getPool() {
  return (globalThis.__placePool ??= mysql.createPool({
    host: requireEnv('MYSQL_HOST'),
    port: Number(requireEnv('MYSQL_PORT')),
    user: requireEnv('MYSQL_USER'),
    password: requireEnv('MYSQL_PASSWORD'),
    database: requireEnv('MYSQL_DATABASE'),
    dateStrings: true, // DATE -> 'YYYY-MM-DD' (no timezone surprises)
    decimalNumbers: true, // DECIMAL -> number
    connectionLimit: 10,
  }));
}

/** Lazy proxy so importing this module never reads env until a query runs. */
export const pool = new Proxy({}, { get: (_t, prop) => { const p = getPool(); const v = p[prop]; return typeof v === 'function' ? v.bind(p) : v; } });

/** Render a parameterised statement as text, so the UI can show the exact SQL that ran. */
export const format = (sql, params) => mysql.format(sql, params);
