#!/usr/bin/env node
'use strict';

// Explicit first-install command, not a migration runner. Never import AppModule:
// its lifecycle starts jobs and seeds records. Existing databases are refused.
require('reflect-metadata');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { DataSource } = require('typeorm');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function entityFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? entityFiles(absolute) : entry.name.endsWith('.entity.js') ? [absolute] : [];
  });
}

async function main() {
  if (process.argv.slice(2).join(' ') !== '--apply') {
    throw new Error('First install only: pass --apply to initialize an EMPTY application database. Existing databases need reviewed migrations.');
  }
  const db = {
    host: required('DATABASE_HOST'), port: Number(process.env.DATABASE_PORT || '5432'),
    user: required('DATABASE_USER'), password: required('DATABASE_PASSWORD'),
    database: required('DATABASE_NAME'),
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 15_000,
  };
  const client = new Client(db);
  let dataSource;
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('plainledger:first-install'))");
    const result = await client.query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') AND schemaname NOT LIKE 'pg_toast%'");
    if (result.rows.length) throw new Error('Refusing bootstrap: database already contains user tables. No schema or data was changed.');
    const builtRoot = fs.existsSync(path.join(__dirname, '../dist/main.js')) ? path.join(__dirname, '../dist') : path.join(__dirname, '../dist/src');
    if (!fs.existsSync(builtRoot)) throw new Error('Compile the API before initializing its database.');
    const entities = entityFiles(builtRoot).flatMap(file => Object.values(require(file)).filter(value => typeof value === 'function' && value.name.endsWith('Entity')));
    if (!entities.length) throw new Error('No compiled TypeORM entities found; refusing to initialize an incomplete schema.');
    const schema = fs.readFileSync(path.join(__dirname, 'bootstrap-schema.sql'), 'utf8');
    if (/^\s*(INSERT|COPY|DELETE|TRUNCATE|DROP)\s/im.test(schema)) throw new Error('Bootstrap schema unexpectedly contains data or destructive statements.');
    // The scaffold and metadata synchronization run only after the empty check.
    // A failure leaves an incomplete NEW database for inspection, never retries
    // by dropping it. The completion marker is written only after every step.
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    for (const name of ['accounting', 'reporting', 'integration', 'intelligence', 'platform', 'tenant', 'datalake']) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${name}"`);
    }
    await client.query(schema);
    dataSource = new DataSource({
      type: 'postgres', host: db.host, port: db.port, username: db.user,
      password: db.password, database: db.database, ssl: db.ssl,
      entities, synchronize: false, logging: false, installExtensions: false,
    });
    await dataSource.initialize();
    await dataSource.synchronize(false);
    // Roles, permissions, subscription plans and entitlements are product
    // configuration required by foreign keys; these do not create customers.
    const referenceData = fs.readFileSync(path.join(__dirname, 'bootstrap-reference-data.sql'), 'utf8');
    await client.query(referenceData);
    await client.query('CREATE TABLE platform.schema_bootstrap (version text PRIMARY KEY, completed_at timestamptz NOT NULL DEFAULT now())');
    await client.query('INSERT INTO platform.schema_bootstrap(version) VALUES ($1)', ['plainledger-initial-20261019']);
    console.log(`Initialized empty database with ${entities.length} entity classes. No demo users, organizations, or accounting records were inserted.`);
  } finally {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await client.end();
  }
}

main().catch(error => { console.error(`Database initialization failed: ${error.message}`); process.exitCode = 1; });
