import { parsePrice } from '../utils/priceParser.js';

export async function scrapeHornbach(page, articleId, log) {
    const url = `https://www.hornbach.de/p/artikel/${articleId}/`;
    log.info(`Hornbach: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Länger warten bis JavaScript fertig geladen hat
    await page.waitForTimeout(5000);

    // Preis direkt aus dem Text extrahieren
    const priceRaw = await page.evaluate(() => {
        // Alle Text-Nodes durchsuchen die € enthalten
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );
        const prices = [];
        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent.trim();
            if (text.match(/^\d+,\d+\s*€\s*\*?$/) && text.includes('€')) {
                prices.push(text);
            }
        }
        return prices[0] ?? null;
    });

    const productName = await page.locator('h1').first().textContent().catch(() => null);

    log.info(`Hornbach raw price: ${priceRaw}`);

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
