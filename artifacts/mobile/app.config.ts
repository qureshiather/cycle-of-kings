import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { ExpoConfig } from "expo/config";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

const config: ExpoConfig = require("./app.json").expo;

export default config;
