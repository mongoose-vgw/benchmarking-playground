import { assert } from "console";

let logger;
export function init(appLogger) {
  logger = appLogger;
}

let Jackpot = class {
  public id;
  public refs;
  public value;

  constructor(id, refs) {
    assert(id !== undefined);
    assert(Array.isArray(refs));
    this.id = id;
    this.refs = refs;
    this.value = 0;
  }

  addContribution(val) {
    logger.debug("addContribution for jackpot id " + this.id);
    this.value += val;
  }

  toJSON() {
    return {
      id: this.id,
      refs: this.refs,
      value: this.value
    }
  }
};

const jackpots = [];

export function startJackpot(eventId, refs) {
  jackpots.push(new Jackpot(eventId, refs));
}

export function contribute(refId, value) {
  for (let j of jackpots) {
    logger.debug("does " + j.refs + " include " + refId);
    if (j.refs.includes(refId)) {
      logger.debug("it does!");
      j.addContribution(value);
    }
  }
}

export function redeem(eventId, refId) {
  // TODO
}

export function getByRefId(refId) {
  return jackpots.filter(j => j.refs.includes(refId)).map(j => j.toJSON());
}

export function getAll() {
  let res = jackpots.map(j => j.toJSON());
  logger.debug(JSON.stringify(res));
  return res;
}
