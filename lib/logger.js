const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;

const loggingFormat = printf(info => {
  return `${info.timestamp} [${info.level}]: ${info.message}`;
});

const logger = createLogger({
  format: combine(timestamp(), loggingFormat),
  transports: [
    new transports.File({
      filename: `${process.env.APP_NAME || "default"}-error.log`,
      level: "error"
    }),
    new transports.File({
      filename: `${process.env.APP_NAME || "default"}-combined.log`
    })
  ]
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: loggingFormat
    })
  );
}

module.exports = logger;
