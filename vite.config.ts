import {defineConfig} from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import handlebars from 'vite-plugin-handlebars';
import basicSsl from '@vitejs/plugin-basic-ssl';
import {visualizer} from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import autoprefixer from 'autoprefixer';
import {resolve} from 'path';
import {existsSync, copyFileSync} from 'fs';
import {ServerOptions} from 'vite';
import {watchLangFile} from './watch-lang.js';
import path from 'path';

const rootDir = resolve(__dirname);
const ENV_LOCAL_FILE_PATH = path.join(rootDir, '.env.local');

const isDEV = process.env.NODE_ENV === 'development';
if(isDEV) {
  if(!existsSync(ENV_LOCAL_FILE_PATH)) {
    copyFileSync(path.join(rootDir, '.env.local.example'), ENV_LOCAL_FILE_PATH);
  }

  watchLangFile();
}

const handlebarsPlugin = handlebars({
  context: {
    title: 'Telegram Web K',
    description: 'Telegram Web K - Modified Version',
    url: './',
    origin: './'
  }
});

const serverOptions: ServerOptions = {
  port: 8080,
  proxy: {
    '/api': {
      target: 'https://api.telegram.org',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, '/api')
    },
    '/v1': {
      target: 'https://v1.web.telegram.org',
      changeOrigin: true,
      secure: false
    }
  },
  sourcemapIgnoreList(sourcePath, sourcemapPath) {
    return sourcePath.includes('node_modules') ||
      sourcePath.includes('logger') ||
      sourcePath.includes('eventListenerBase');
  }
};

const SOLID_SRC_PATH = 'src/solid/packages/solid';
const SOLID_BUILT_PATH = 'src/vendor/solid';
const USE_SOLID_SRC = false;
const SOLID_PATH = USE_SOLID_SRC ? SOLID_SRC_PATH : SOLID_BUILT_PATH;
const USE_OWN_SOLID = existsSync(resolve(rootDir, SOLID_PATH));

const USE_SSL = false;
const USE_SSL_CERTS = false;
const NO_MINIFY = false;
const SSL_CONFIG: any = USE_SSL_CERTS && USE_SSL && {
  name: '192.168.95.17',
  certDir: './certs/'
};

const ADDITIONAL_ALIASES = {
  'solid-transition-group': resolve(rootDir, 'src/vendor/solid-transition-group')
};

if(USE_OWN_SOLID) {
  console.log('using own solid', SOLID_PATH, 'built', !USE_SOLID_SRC);
} else {
  console.log('using original solid');
}

export default defineConfig({
  base: './', // ВАЖНО для GitHub Pages
  plugins: [
    process.env.VITEST ? undefined : checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}" --ignore-pattern "/src/solid/*"',
        useFlatConfig: true
      }
    }),
    solidPlugin(),
    handlebarsPlugin as any,
    USE_SSL ? (basicSsl as any)(SSL_CONFIG) : undefined,
    process.env.ANALYZE_BUNDLE ? visualizer({
      gzipSize: true,
      template: 'treemap'
    }) : undefined
  ].filter(Boolean),
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/solid/**'
    ],
    environment: 'jsdom',
    testTransformMode: {web: ['.[jt]sx?$']},
    threads: false,
    isolate: false,
    globals: true,
    setupFiles: ['./src/tests/setup.ts']
  },
  server: serverOptions,
  build: {
    target: 'es2020',
    sourcemap: false,
    assetsDir: '',
    copyPublicDir: false,
    emptyOutDir: true,
    minify: NO_MINIFY ? false : 'esbuild',
    rollupOptions: {
      output: {
        sourcemapIgnoreList: serverOptions.sourcemapIgnoreList
      }
    }
  },
  worker: {
    format: 'es'
  },
  css: {
    devSourcemap: false,
    postcss: {
      plugins: [
        autoprefixer({})
      ]
    }
  },
  define: {
    global: 'globalThis',
    '__DEV__': JSON.stringify(process.env.NODE_ENV === 'development')
  },
  resolve: {
    alias: USE_OWN_SOLID ? {
      'rxcore': resolve(rootDir, SOLID_PATH, 'web/core'),
      'solid-js/jsx-runtime': resolve(rootDir, SOLID_PATH, 'jsx'),
      'solid-js/web': resolve(rootDir, SOLID_PATH, 'web'),
      'solid-js/store': resolve(rootDir, SOLID_PATH, 'store'),
      'solid-js': resolve(rootDir, SOLID_PATH),
      ...ADDITIONAL_ALIASES
    } : ADDITIONAL_ALIASES
  }
});
