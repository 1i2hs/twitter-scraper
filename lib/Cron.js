class Cron {
  constructor() {
    if (!Cron.instance) {
      this.intervalId = null;
      Cron.instance = this;
    }
    return Cron.instance;
  }

  start(fn, interval = 1000 * 60 * 20) {
    if (!fn)
      throw new Error(
        "job(function to be executed) must be given as argument."
      );
    if (!this.intervalId) {
      this.intervalId = setInterval(fn, interval);
    }
  }

  end() {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

module.exports = Cron;
