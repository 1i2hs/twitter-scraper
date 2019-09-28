const axios = require("axios");
const cheerio = require("cheerio");
const _cliProgress = require("cli-progress");
const _colors = require("colors");
const xlsx = require("node-xlsx");
const moment = require("moment");
const fs = require("fs");
const path = require("path");

class Scraper {
  /**
   * main function which scapes # of tweeets, followers, and followings from the twitter.
   * options.inputType = File || Array<String> || String
   * options.inputFileDir (optional) = "String"
   *
   * @param {*} options
   */
  constructor(options) {
    this.options = options;
  }

  async scrape(accounts) {
    let accountList;
    if (this.options) {
      switch (this.options.inputType) {
        case "File":
          accountList = this.loadTwitterAccounts(
            this.options.inputFileDir ||
              path.join(process.cwd(), "twitter_accounts.txt")
          );
          break;
        case "Array<String>":
          accountList = accounts;
          break;
        case "String":
          accountList = [accounts];
          break;
        default:
          throw new Error(
            "There are no accounts given as input. Please input at least one account to scrape data."
          );
      }
    }

    let currentAccountCount = 0;
    try {
      const interpolatedAccountList = this.interpolateTwitterUrl(accountList);

      const accountCount = interpolatedAccountList.length;

      const result = new Array(accountCount + 1);

      result[0] = [
        "트위터 주소",
        "누적 트윗수",
        "누적 팔로워수",
        "누적 팔로잉수"
      ];

      // create new progress bar
      const progressBar = new _cliProgress.SingleBar({
        format:
          "Scraping [" +
          _colors.cyan("{bar}") +
          `] {percentage}% | {value}/{total} accounts | Duration: {duration}s | "{accountUrl}"`,
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true
      });

      // initialize the bar - defining payload token "speed" with the default value "N/A"
      progressBar.start(accountCount, currentAccountCount, {
        eta: "",
        barsize: 25
      });

      const startTime = moment();
      for (let i = 1; i <= accountCount; i++) {
        try {
          const currentUrl = interpolatedAccountList[i - 1];
          currentAccountCount = i;
          progressBar.update(currentAccountCount - 1, {
            accountUrl: currentUrl
          });

          const response = await axios(currentUrl);

          const html = response.data;
          const $ = cheerio.load(html);

          // tweet
          const tweetCount = this.getCount(
            $,
            "li.ProfileNav-item.ProfileNav-item--tweets > a > span.ProfileNav-value"
          );

          // followers
          const followersCount = this.getCount(
            $,
            "li.ProfileNav-item.ProfileNav-item--followers > a > span.ProfileNav-value"
          );

          // following
          const followingCount = this.getCount(
            $,
            "li.ProfileNav-item.ProfileNav-item--following > a > span.ProfileNav-value"
          );

          result[i] = [
            { v: currentUrl, t: "s" },
            { v: Number(tweetCount), t: "n", z: "#,##0 ;(#,##0)" },
            { v: Number(followersCount), t: "n", z: "#,##0 ;(#,##0)" },
            { v: Number(followingCount), t: "n", z: "#,##0 ;(#,##0)" }
          ];
        } catch (err) {
          // console.error(
          //   `Error occured with the url: ${interpolatedAccountList[i - 1]}`
          // );
          // console.error(err);
          result[i] = [interpolatedAccountList[i - 1], 0, 0, 0];
        } finally {
          // const duration = moment
          //   .duration(startTime.diff(moment()))
          //   .asSeconds();
          progressBar.update(currentAccountCount);
        }
      }
      progressBar.stop();
      console.log("Complete scraping");

      return xlsx.build([{ name: "트위터", data: result }]);
    } catch (err) {
      console.error(err);
    }
  }

  loadTwitterAccounts(fileDir) {
    // read excel file to load twitter accounts
    try {
      const readData = fs.readFileSync(fileDir, "utf8");
      const result = readData.split("\n");

      return result;
    } catch (err) {
      console.error(err);
      throw new Error(
        "Could not read account file. Please check your account file"
      );
    }
  }

  getCount($, selector) {
    const element = $(selector);
    const count = element.attr("data-count");
    return count ? count : 0;
  }

  interpolateTwitterUrl(accounts) {
    // accounts given as urls || @{account} || {account}
    // e.g. "http://twitter.com/some_id" || @some_id || some_id
    const regexForTwitterUrl = /http[s]*\:\/\/twitter.com\/([a-zA-Z]|[0-9]|_)+/g;
    const regexForTwitterAccount0 = /@([a-zA-Z]|[0-9]|_)+/g;
    const regexForTwitterAccount1 = /([a-zA-Z]|[0-9]|_)+/g;

    return accounts.map(account => {
      if (typeof account !== "string")
        throw new Error(`Twitter account("${account}") is not String type.`);
      if (account.match(regexForTwitterUrl)) {
        return account;
      } else if (account.match(regexForTwitterAccount0)) {
        return `http://twitter.com/${account.slice(1)}`; // removes @ from the string
      } else if (account.match(regexForTwitterAccount1)) {
        return `http://twitter.com/${account}`;
      } else {
        throw new Error(
          `Twitter account("${account}") is written in wrong format. It must be either "http://twitter.com/some_id", "@some_id", or "some_id".`
        );
      }
    });
  }
}

module.exports = options => new Scraper(options);
