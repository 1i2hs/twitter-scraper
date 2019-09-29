const errorCode = {
  NO_ACCOUNT_PROVIDED: "ts-error-01",
  TASK_NOT_FOUND: "ts-error-02",
  PROCESSED_DATA_LOST: "ts-error-03",
  WRONG_FORMAT_ACCOUNT_LIST_AS_INPUT: "ts-error-04",
  PROCESSED_DATA_NOT_FOUND: "ts-error-05"
};

Object.freeze(errorCode);

module.exports = errorCode;
