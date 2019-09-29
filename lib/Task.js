class Task {
  constructor(taskId, scraper, expirationOffset = 30 * 60 * 1000) {
    if (!scraper) {
      throw new Error("Scraper object must be provided to create Task object.");
    }
    this.taskId = taskId;
    this.scraper = scraper;
    this.created = Date.now();
    this.expires = this.created * 1 + expirationOffset * 1;
    this.complete = false;
  }

  isExpired() {
    return Date.now() >= this.expires;
  }

  isComplete() {
    return this.complete;
  }
}

module.exports = Task;
