const path = require("path");

module.exports = {
  entry: "./app.js",
  output: {
    filename: "app_bundle.js",
    path: path.resolve(__dirname)
  },
  target: "async-node"
};
