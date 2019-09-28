const puppeteer = require("puppeteer-core");
const xlsx = require("node-xlsx");
const fs = require("fs");
const os = require("os");

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
            this.options.inputFileDir || `${process.cwd()}/twitter_accounts.txt`
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

    const executablePath = this.getChromePath();

    try {
      const browser = await puppeteer.launch({
        // headless: true,
        headless: false,
        executablePath
      });
      const page = await browser.newPage();

      const interpolatedAccountList = this.interpolateTwitterUrl(accountList);

      const accountCount = interpolatedAccountList.length;

      const result = new Array(accountCount + 1);
      result[0] = [
        "트위터 주소",
        "누적 트윗수",
        "누적 팔로워수",
        "누적 팔로잉수"
      ];
      console.time("Scraping");
      for (let i = 1; i <= accountCount; i++) {
        try {
          const currentUrl = interpolatedAccountList[i - 1];
          console.log(`#${i}. Scraping url: ${currentUrl}`);

          await page.goto(currentUrl);
          await page.setViewport({ width: 1516, height: 948 });

          // tweet
          const tweetCount = await this.getCount(
            page,
            "li.ProfileNav-item.ProfileNav-item--tweets > a > span.ProfileNav-value"
          );

          // followers
          const followersCount = await this.getCount(
            page,
            "li.ProfileNav-item.ProfileNav-item--followers > a > span.ProfileNav-value"
          );

          // following
          const followingCount = await this.getCount(
            page,
            "li.ProfileNav-item.ProfileNav-item--following > a > span.ProfileNav-value"
          );

          console.log(
            `  >> Tweets: ${tweetCount} / Followers: ${followersCount} / Following: ${followingCount}`
          );
          result[i] = [
            { v: currentUrl, t: "s" },
            { v: Number(tweetCount), t: "n", z: "#,##0 ;(#,##0)" },
            { v: Number(followersCount), t: "n", z: "#,##0 ;(#,##0)" },
            { v: Number(followingCount), t: "n", z: "#,##0 ;(#,##0)" }
          ];
        } catch (err) {
          console.error(
            `Error occured with the url: ${interpolatedAccountList[i - 1]}`
          );
          console.error(err);
          result[i] = [interpolatedAccountList[i - 1], 0, 0, 0];
        } finally {
          console.log();
        }
      }
      console.log("Complete scarping");
      console.timeEnd("Scraping");

      await page.close();
      await browser.close();

      return xlsx.build([{ name: "트위터", data: result }]);
    } catch (err) {
      console.error(err);
    }
  }

  getChromePath() {
    const osType = os.type();
    switch (osType) {
      case "Linux":
        return "";
      case "Darwin": // macOS
        return `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`;
      case "Windows_NT":
        // Win 10
        const win10ChromePath =
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
        const win7ChromePath = `C:\\Program Files (x86)\\Google\\Application\\chrome.exe`;
        if (fs.existsSync(win10ChromePath)) return win10ChromePath;
        else return win7ChromePath;
      default:
        throw new Error(
          `Unsupported OS type: ${osType}. It must be one of "Linux", "Darwin", or "Windows_NT`
        );
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

  async getCount(page, selectorString) {
    try {
      let f = selector => {
        const targetElement = window.document.querySelector(selector);
        return targetElement.getAttribute("data-count");
      }
      return await page.evaluate(`(${f.toString()})(${JSON.stringify(selectorString)})`);
    } catch (err) {
      console.error(err);
      return 0;
    }
  }
}

module.exports = options => new Scraper(options);
