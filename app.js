const express = require("express");
const compression = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const uuidv4 = require("uuid/v4");

const scraper = require("./lib/scraper");
const Task = require("./lib/Task");
const Cron = require("./lib/Cron");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(compression());
app.use(cors());

const logger = require("./lib/logger");

const PORT = process.env.PORT || 3000;
const APP_NAME = process.env.APP_NAME || "twitter-scraper";
const CLEAR_CACHE_INTERVAL = process.env.CLEAR_CACHE_INTERVAL || 30 * 60 * 1000;
const DATA_EXPIRATION_TIME_OFFSET =
  process.env.DATA_EXPIRATION_TIME_OFFSET || 30 * 60 * 1000;

/**
 * error handling
 */
app.use((err, req, res, next) => {
  next(err);
});

process.on("uncaughtException", err => {
  logger.error(err.stack);
});

app.listen(PORT, () => logger.info(`${APP_NAME} listening at port ${PORT}`));

const taskMap = new Map();

const dataMap = new Map();

const remover = new Cron();

remover.start(() => {
  if (taskMap.size == 0) {
    logger.info(
      "## There are no tasks or data stored in caches. Postponed deletion process."
    );
    return;
  }
  logger.info("## Deleting expired tasks and data from caches...");
  const taskKeys = taskMap.keys();
  let taskKey = taskKeys.next();
  const startTime = Date.now();
  let taskCount = 0;
  let dataCount = 0;

  while (!taskKey.done) {
    let curKey = taskKey.value;
    logger.info(`> Checking: ${curKey}`);
    if (taskMap.get(curKey).isExpired()) {
      taskMap.delete(curKey);
      logger.info(`> Deleted task with ID: ${curKey}`);
      taskCount++;
      if (dataMap.has(curKey)) {
        dataMap.delete(taskKey.value);
        logger.info(`> Deleted data with ID: ${curKey}`);
        dataCount++;
      }
    } else {
      logger.info("> Not expired");
    }
    taskKey = taskKeys.next();
  }
  logger.info(`# Processed time: ${(Date.now() - startTime) / 1000}s`);
  logger.info(`# Number of deleted task: ${taskCount}`);
  logger.info(`# Number of deleted data: ${dataCount}`);
  logger.info("## Deleting process complete.");
}, CLEAR_CACHE_INTERVAL);

app.post("/twitter-reports", (req, res) => {
  logger.info(`GET /twitter-reports`);
  const accountList = req.body ? req.body.accountList : new Array();

  const newScraper = scraper({ inputType: "Array<String>" });
  const taskId = uuidv4();

  const task = new Task(taskId, newScraper, DATA_EXPIRATION_TIME_OFFSET);
  taskMap.set(taskId, task);

  logger.info(`> Start scraping: ${taskId}`);
  newScraper
    .scrape(accountList)
    .then(data => {
      logger.info(`> End scraping: ${taskId}`);
      if (!taskMap.has(taskId)) {
        throw new Error(`A task with id: ${taskId}, is not stored properly.`);
      }
      const task = taskMap.get(taskId);
      task.complete = true;
      dataMap.set(taskId, data);
    })
    .catch(err => {
      logger.error(err);
      if (taskMap.has(taskId)) {
        taskMap.delete(taskId);
      }
    });

  res.location(`/tasks/${taskId}`);
  res.status(202).send({
    taskId,
    created: task.created,
    expires: task.expires
  });
});

app.get("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  logger.info(`GET /tasks/${taskId}`);
  if (!taskMap.has(taskId)) {
    res.status(404).send(`A task with id: ${taskId}, is not found.`);
    return;
  }

  const task = taskMap.get(taskId);
  if (task.isComplete()) {
    if (dataMap.has(taskId)) {
      res.location(`/results/${taskId}`);
      res.status(201).send("Scraping done and result created.");
      return;
    } else {
      logger.error(
        `A data with id: ${taskId}, is not availble. Perhaps it failed to store result data in the dataMap`
      );
      taskMap.delete(taskId);
      res
        .status(404)
        .send(
          `A data with id: ${taskId}, is not availble. Perhaps it failed to store result data in the dataMap`
        );
      return;
    }
  }

  const curScraper = task.scraper;

  // if report created, set status code into 201 and set Location header for the resource
  res.status(200).send({
    id: taskId,
    currentValue: curScraper.doneAccountCount,
    totalValue: curScraper.totalAccountCount,
    elapsedTime: Date.now() - task.created
  });
});

app.delete("/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  logger.info(`DELETE /tasks/${taskId}`);
  if (!taskMap.has(taskId)) {
    res.status(404).send("Not Found");
    return;
  }

  taskMap.delete(taskId);
  if (dataMap.has(taskId)) {
    dataMap.delete(taskId);
  }
  res.status(204).send(`Task with id: ${taskId}, has been removed safely.`);
});

app.get("/results/:id", (req, res) => {
  const dataId = req.params.id;
  logger.info(`GET /tasks/${dataId}`);
  if (!dataMap.has(dataId)) {
    res.status(404).send("Not Found");
    return;
  }
  const data = dataMap.get(dataId);
  res.send({
    data
  });
});

app.get("/live", (req, res) => {
  logger.info(`GET /live`);
  res.status(200).end("system running...");
});
