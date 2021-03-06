let db;
let logger;
let jackpots;

export function init(appDB, appJackpots, appLogger) {
  db = appDB;
  logger = appLogger;
  jackpots = appJackpots;
}

export async function addEvent(ev) {
  const dbEv = await db.insertEvent(ev);
  logger.debug(JSON.stringify(dbEv));
  processEvent(dbEv);
  return dbEv;
}

function processEvent(ev) {
  logger.debug("processing event " + JSON.stringify(ev));
  switch (ev.type) {
    case 'start':
      processStartEvent(ev);
      break;
    case 'contribute':
      processContributeEvent(ev);
      break;
    case 'redeem':
      processRedeemEvent(ev);
      break;
  }
}

export async function loadEvents() {
  await db.createTable();
  return db.loadEvents(processEvent);
}

function processStartEvent(ev) {
  logger.debug("processing start event " + JSON.stringify(ev));
  const eventId = ev.id;
  const refs = ev.refs;
  jackpots.startJackpot(eventId, refs);
}

function processContributeEvent(ev) {
  logger.debug("processing contribute event " + JSON.stringify(ev));
  const refId = ev.refId;
  const value = ev.value;
  jackpots.contribute(refId, value);
}

function processRedeemEvent(ev) {
  logger.debug("processing redeem event " + JSON.stringify(ev));
  const eventId = ev.id;
  const refId = ev.refId;
  jackpots.redeem(eventId, refId);
}
