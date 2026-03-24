import { parsePrice } from '../utils/priceParser.js';

export async function scrapeHornbach(page, articleId, log) {
    const url = `https://www.hornbach.de/p/artikel/${articleId}/`;
    log.info(`Hornbach: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Cloudflare Challenge abwarten falls nötig
    await page.waitForTimeout(3000);

    // Cookie Banner wegklicken
    const cookieBtn = page.locator('#usercentrics-root').first();
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }

    // Markt-Popup wegklicken falls vorhanden
    const closeBtn = page.locator('button[aria-label="close"], button[aria-label="schließen"], .modal-close').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
    }

    // Preis aus erstem Preis-Element holen
    const priceRaw = await page.evaluate(() => {
        const allEls = document.querySelectorAll('[class^="ad_"]');
        for (const el of allEls) {
            const text = el.textContent.trim();
            if (text.includes('€') && text.includes('pro ST')) {
                const match = text.match(/(\d+,\d+)\s*€/);
                if (match) return match[1] + ' €';
            }
        }
        return null;
    });

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
