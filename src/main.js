import { Actor } from 'apify';
import { scrapeHornbach } from './scrapers/hornbach.js';

await Actor.init();

// Debug: Raw response anzeigen
const testRes = await fetch('https://www.hornbach.de/frontend/query?operationName=PriceAndDeliveryInfo&fitlocale=de-DE', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, */*',
        'Origin': 'https://www.hornbach.de',
        'Referer': 'https://www.hornbach.de/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    body: JSON.stringify([{
        operationName: 'PriceAndDeliveryInfo',
        query: 'query { __typename }',
        variables: { abstractProductId: '3829333', concreteProductId: '', quantity: 1, offerReference: 'DE850_3829333_ST', productMeasurementUnitCode: 'ST' },
    }]),
});
console.log('Status:', testRes.status);
console.log('Response:', await testRes.text());

const input = await Actor.getInput();
const { products = [] } = input;

if (!products.length) {
    throw new Error('No products provided in input!');
}

console.log(`🔨 Hornbach Price Scraper – ${products.length} Artikel`);

const dataset = await Actor.openDataset('hornbach-prices');

for (const product of products) {
    const { articleId } = product;

    if (!articleId) {
        console.warn('Skipping product without articleId:', product);
        continue;
    }

    try {
        const result = await scrapeHornbach(articleId, console);

        if (result) {
            await dataset.pushData(result);
            console.log(`✅ ${articleId} | ${result.price} ${result.currency} | "${result.productName}"`);
        } else {
            await dataset.pushData({
                articleId,
                shop: 'hornbach',
                productName: null,
                price: null,
                currency: null,
                productUrl: `https://www.hornbach.de/p/artikel/${articleId}/`,
                inStock: false,
                error: 'Product not found',
                scrapedAt: new Date().toISOString(),
            });
        }
    } catch (err) {
        console.error(`❌ ${articleId} | Error: ${err.message}`);
        await dataset.pushData({
            articleId,
            shop: 'hornbach',
            productName: null,
            price: null,
            currency: null,
            productUrl: `https://www.hornbach.de/p/artikel/${articleId}/`,
            inStock: null,
            error: err.message,
            scrapedAt: new Date().toISOString(),
        });
    }

    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
}

const { itemCount } = await dataset.getInfo();
console.log(`\n🏁 Fertig! ${itemCount} Ergebnisse gespeichert.`);

await Actor.exit();
