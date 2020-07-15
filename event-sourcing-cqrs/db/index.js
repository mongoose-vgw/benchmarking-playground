const dotenv = require('dotenv');
dotenv.config();

const { Pool, Connection } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.DATABASE_MAX_CONN,
});

const Cursor = require('pg-cursor');

async function query(sql) {
  const connection = await pool.connect();
  let res;

  try {
    res = await connection.query(sql);
  } catch (err) {
    console.log(err);
  } finally {
    connection.release();
  }

  return res;
}

function readCursor(cursor, count) {
  return new Promise((resolve, reject) => {
      cursor.read(count, (err, rows, result) => {
          if (err) {
              return reject(err);
          }
          return resolve(rows);
      });
  });
}

// load all events from db and pass them to the process pipeline
async function loadEvents(processFn) {
  console.log("Loading events from DB");
  const connection = await pool.connect();
  const CHUNK_SIZE = 100;
  try {
    const text = 'SELECT * FROM "Events" ORDER BY "createdAt" ASC';
    const cursor = connection.query(new Cursor(text));

    do {
      const rows = await readCursor(cursor, CHUNK_SIZE);
      if (rows.length === 0) {
          break;
      }
      rows.forEach(row => {
        let dbEv = row.payload;
        dbEv.id = row.id;
        processFn(dbEv);
      });
    } while (true);
  } finally {
    connection.end();
  }
}

async function dropTable() {
  let sql = `DROP TABLE IF EXISTS "Events"`;
  await query(sql);
}

async function createTable() {
  let sql = `CREATE TABLE IF NOT EXISTS "Events" (
    id SERIAL,
    payload JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "Events_pkey" PRIMARY KEY(id)
  )
  WITH (oids = false);`;
  await query(sql);

  sql = `CREATE INDEX idx_refid ON "Events" ((payload->>'refId'))`;
  await query(sql);

  sql = `CREATE INDEX idx_value ON "Events" ((payload->>'type'))`;
  await query(sql);
}

async function deleteEvents() {
  const sql = `TRUNCATE "Events"`;
  await query(sql);
}

async function getRefIdAggregateValue(refId) {
  const sql = `select sum(CAST(payload ->> 'value' AS INTEGER)) AS val from  "Events" 
                WHERE payload ->> 'refId' = '${refId}' AND payload ->> 'type' = 'spin'`;
  let res = await query(sql);
  //console.log(res);
  return res.rows[0].val;
}
async function insertEvent(ev) {
  const sql = `
      INSERT INTO 
      "Events"
      (
        "payload", "createdAt"
      )
      VALUES (
        '${JSON.stringify(ev)}', now()
      ) RETURNING "id", "payload", "createdAt"
    `;

  return await query(sql);
}

module.exports = {
  loadEvents,
  dropTable,
  createTable,
  deleteEvents, 
  insertEvent,
  getRefIdAggregateValue
}