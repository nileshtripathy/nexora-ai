import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DEFAULT = "postgresql://supportai:supportai@localhost:5432/supportai_test";

/** Creates (if needed) and migrates a throwaway `*_test` database by replaying prisma/migrations/*.sql. Never touches your dev DB. */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? DEFAULT);
  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`Refusing to run tests against "${name}": the database name must end with _test`);

  const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name])).rowCount) await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();

  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const dir = path.join(process.cwd(), "prisma", "migrations");
  for (const m of fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort())
    await client.query(fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  await client.end();
}
