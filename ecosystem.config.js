module.exports = {
  apps: [
    {
      name: "twitter-scraper",
      script: "./app.js",
      exp_backoff_restart_delay: 500,
      watch: ["app.js", "./lib/*"],
      watch_delay: 1000,
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        APP_NAME: "twitter-scaper",
        CLEAR_CACHE_INTERVAL: 30 * 60 * 1000,
        DATA_EXPIRATION_TIME_OFFSET: 30 * 1000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        APP_NAME: "twitter-scraper",
        CLEAR_CACHE_INTERVAL: 30 * 60 * 1000,
        DATA_EXPIRATION_TIME_OFFSET: 30 * 60 * 1000
      }
    }
  ]
};
