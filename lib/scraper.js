const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

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
    this.doneAccountCount = 0;
    this.totalAccountCount = 0;
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

    try {
      const interpolatedAccountList = this.interpolateTwitterUrl(accountList);

      this.totalAccountCount = interpolatedAccountList.length;

      const result = new Array(this.totalAccountCount);

      let currentAccountIndex = 0;
      for (let i = 0; i < this.totalAccountCount; i++) {
        try {
          currentAccountIndex = i;
          const currentUrl = interpolatedAccountList[i];

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

          result[i] = {
            ac: currentUrl,
            tc: tweetCount,
            fsc: followersCount,
            fgc: followingCount
          };
        } catch (err) {
          logger.error(
            `Error occured with the url: ${interpolatedAccountList[i]}`
          );
          logger.error(err);
          result[i] = {
            ac: interpolatedAccountList[i],
            tc: 0,
            fsc: 0,
            fgc: 0
          };
        } finally {
          this.doneAccountCount = currentAccountIndex + 1;
        }
      }
      return result;
    } catch (err) {
      logger.error(err);
    }
  }

  loadTwitterAccounts(fileDir) {
    // read excel file to load twitter accounts
    try {
      const readData = fs.readFileSync(fileDir, "utf8");
      const result = readData.split("\n");

      return result;
    } catch (err) {
      looger.error(err);
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
