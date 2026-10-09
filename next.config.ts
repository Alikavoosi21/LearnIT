import type { NextConfig } from 'next';
const config: NextConfig = { turbopack: { root: process.cwd() },outputFileTracingIncludes:{'/api/tutor':['./rag/index.json']} };
export default config;
