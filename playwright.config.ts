import { defineConfig } from '@playwright/test';
const url=process.env.LEARNIT_E2E_URL??'http://localhost:3100';
export default defineConfig({testDir:'./tests/e2e',workers:1,use:{baseURL:url,channel:'chrome',headless:true},webServer:{command:'npm run dev',url,reuseExistingServer:true,timeout:90000}});
