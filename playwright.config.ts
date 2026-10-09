import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',workers:1,use:{baseURL:'http://localhost:3100',channel:'chrome',headless:true},webServer:{command:'npm run dev',url:'http://localhost:3100',reuseExistingServer:true,timeout:90000}});
