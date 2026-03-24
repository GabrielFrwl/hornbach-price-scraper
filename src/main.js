import { Actor } from 'apify';
import { PlaywrightCrawler, sleep } from 'crawlee';
import { scrapeHornbach } from './scrapers/hornbach.js';

await Actor.init();

const input = await Actor.getInput();
const { products = [] } = input;

if (!products.length) {
    throw new Error('No products provided in input!');
}

console.log(`🔨 Hornbach Price Scraper – ${products.length} Artikel`);

const dataset = await Actor.openDataset();

const crawler = new PlaywrightCrawler({
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 60,
    launchContext: {
        launchOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    },
    async requestHandler({ page, request, log }) {
        const { articleId } = request.userData;
        await sleep(1000 + Math.random() * 1000);

        try {
            const result = await scrapeHornbach(page, articleId, log);
            if (result) {
                await dataset.pushData(result);
                log.info(`✅ ${articleId} | ${result.price} EUR | "${result.productName}"`);
            } else {
                await dataset.pushData({
                    articleId, shop: 'hornbach', price: null,
                    error: 'Not found', scrapedAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            log.error(`❌ ${articleId} | ${err.message}`);
            await dataset.pushData({
                articleId, shop: 'hornbach', price: null,
                error: err.message, scrapedAt: new Date().toISOString(),
            });
        }
    },
});

await crawler.run(products.map(p => ({
    url: `https://www.hornbach.de/p/artikel/${p.articleId}/`,
    userData: { articleId: p.articleId },
})));

const { itemCount } = await dataset.getInfo();
console.log(`\n🏁 Fertig! ${itemCount} Ergebnisse gespeichert.`);

await Actor.exit();
