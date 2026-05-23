const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const dir = __dirname;
const envPath = path.resolve(dir, "../../.env");

dotenv.config({ path: envPath });

const appJson = JSON.parse(fs.readFileSync(path.join(dir, "app.json"), "utf8"));

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    // Fallback when Metro does not inline EXPO_PUBLIC_* (monorepo root .env)
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
};
