import rollupFiles from 'w-package-tools/src/rollupFiles.mjs'
import getFiles from 'w-package-tools/src/getFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'


rollupFiles({
    fns: 'WDwdataHub.mjs',
    fdSrc,
    fdTar,
    nameDistType: 'kebabCase', //直接由hookNameDist給予
    globals: {
        'child_process': 'child_process',
        'util': 'util',
        'path': 'path',
        'module': 'module',
        'http': 'http',
        'https': 'https',
        'stream': 'stream',
        'zlib': 'zlib',
        'events': 'events',
        'buffer': 'buffer',
        'cheerio': 'cheerio',
        'rss-parser': 'rss-parser',
        'playwright': 'playwright',
        '@mozilla/readability': '@mozilla/readability',
        'jsdom': 'jsdom',
    },
    external: [
        'child_process',
        'util',
        'path',
        'module',
        'http',
        'https',
        'stream',
        'zlib',
        'events',
        'buffer',
        'cheerio',
        'rss-parser',
        'playwright',
        '@mozilla/readability',
        'jsdom',
    ],
})

