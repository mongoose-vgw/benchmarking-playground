let startTime = Date.now();
const log = require('pino')({ level: 'info', prettyPrint: true });

const fastify = require("fastify");
const app = fastify({
  logger: log
});
const port = 3000;

app.server.keepAliveTimeout = 0;

const db = require("./db")(app);
const jackpots = require("./jackpots")(app);
const events = require("./events")(app, db, jackpots);

let requestCount = 0;
app.addHook('onRequest', (request, reply, done) => {
  ++requestCount % 100000 === 0 ? app.log.warn(`${requestCount} requests processed ====== `) : null;
  done();
});

app.get("/jackpots", { logLevel: "warn" }, async (req, res) => {
  res.send(jackpots.getAll());
});

app.get("/jackpots/:refId", { logLevel: "warn" }, async (req, res) => {
  let refId = req.params.refId;
  res.send(jackpots.getByRefId(refId));
});

app.get("/jackpots/:refId/raw", { logLevel: "warn" }, async (req, res) => {
  let refId = req.params.refId;
  let r = await db.getRefIdAggregateValue(refId);
  res.send(r);
});

app.post("/events", { logLevel: "warn" }, async (req, res) => {
  let ev = req.body;
  try {
    let r = events.addEvent(ev);
    res.status(201).send(r);
  } catch (err) {
    app.log.error(err);
    res.status(500).send(err);
  }
});

// Run the server!
const start = async () => {
  try {
    if (jackpots.getAll().length === 0) {
      app.log.info("Starting jackpots ...");

      let startJackpotEvent = {
        type: 'start',
        refs: ['A', 'C']
      }
      events.addEvent(startJackpotEvent);

      startJackpotEvent = {
        type: 'start',
        refs: ['B', 'D']
      }
      events.addEvent(startJackpotEvent);
    }

    await app.listen(port, "0.0.0.0");
    app.log.info(`server listening on ${app.server.address().port}`);
    let endTime = Date.now();
    app.log.info(`startup time ${endTime - startTime}ms`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// load events from DB then start the server
events.loadEvents().then(() => start());