import { Actor } from 'apify';
import { sleep } from 'crawlee';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeHornbach } from './scrapers/hornbach.js';

chromium.use(StealthPlugin());

await Actor.init();

const input = await Actor.getInput();
const { products = [] } = input;

if (!products.length) {
    throw new Error('No products provided in input!');
}

console.log(`🔨 Hornbach Price Scraper – ${products.length} Artikel`);

const dataset = await Actor.openDataset();

const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const product of products) {
    const { articleId } = product;
    const page = await browser.newPage();

    try {
        await sleep(2000 + Math.random() * 2000);
        const result = await scrapeHornbach(page, articleId, console);

        if (result) {
            await dataset.pushData(result);
            console.log(`✅ ${articleId} | ${result.price} EUR | "${result.productName}"`);
        } else {
            await dataset.pushData({
                articleId, shop: 'hornbach', price: null,
                error: 'Not found', scrapedAt: new Date().toISOString(),
            });
        }
    } catch (err) {
        console.error(`❌ ${articleId} | ${err.message}`);
        await dataset.pushData({
            articleId, shop: 'hornbach', price: null,
            error: err.message, scrapedAt: new Date().toISOString(),
        });
    } finally {
        await page.close();
    }
}

await browser.close();

const { itemCount } = await dataset.getInfo();
console.log(`\n🏁 Fertig! ${itemCount} Ergebnisse gespeichert.`);

await Actor.exit();
