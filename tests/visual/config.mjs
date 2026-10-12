import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({define:{'process.env':{}},root:fileURLToPath(new URL('.',import.meta.url)),publicDir:repo+'public',plugins:[react()],resolve:{alias:{'next/image':fileURLToPath(new URL('image.tsx',import.meta.url)),'next/dynamic':fileURLToPath(new URL('dynamic.tsx',import.meta.url)),'@clerk/nextjs':fileURLToPath(new URL('clerk.tsx',import.meta.url)),'@twilio/voice-sdk':fileURLToPath(new URL('phone.ts',import.meta.url))}},server:{host:'127.0.0.1',port:4179,strictPort:true,fs:{allow:[repo]}}});
