import { parsePrice } from '../utils/priceParser.js';

export async function scrapeHornbach(page, articleId, log) {
    const url = `https://www.hornbach.de/p/artikel/${articleId}/`;
    log.info(`Hornbach: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const pageTitle = await page.title();
    if (pageTitle === 'Client Challenge') {
        log.warning(`Hornbach: Cloudflare Block für ${articleId}`);
        return null;
    }

    const priceRaw = await page.evaluate(() => {
        const allEls = document.querySelectorAll('[class*="ad_"]');
        for (const el of allEls) {
            const text = el.textContent.trim();
            if (text.includes('€') && text.includes('pro ST')) {
                const match = text.match(/(\d+,\d+)\s*€/);
                if (match) return match[1] + ' €';
            }
        }
        return null;
    });

    log.info(`Hornbach raw price: "${priceRaw}"`);

    const productName = await page.locator('h1').first().textContent().catch(() => null);

    if (!priceRaw) {
        log.warning(`Hornbach: Kein Preis gefunden für ${articleId}`);
        return null;
    }

    return {
        articleId,
        shop: 'hornbach',
        productName: productName?.trim() ?? null,
        price: parsePrice(priceRaw),
        currency: 'EUR',
        productUrl: page.url(),
        inStock: true,
        scrapedAt: new Date().toISOString(),
    };
}
