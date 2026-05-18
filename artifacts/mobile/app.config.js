const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const dir = __dirname;

dotenv.config({ path: path.resolve(dir, "../../.env") });

const appJson = JSON.parse(fs.readFileSync(path.join(dir, "app.json"), "utf8"));

/** @type {import('@expo/config').ExpoConfig} */
module.exports = appJson.expo;
