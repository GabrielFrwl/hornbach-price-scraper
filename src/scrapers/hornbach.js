import { parsePrice } from '../utils/priceParser.js';

export async function scrapeHornbach(page, articleId, log) {
    const url = `https://www.hornbach.de/p/artikel/${articleId}/`;
    log.info(`Hornbach: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Markt-Popup wegklicken ("Ja, richtig" oder X)
    const jaRichtigBtn = page.locator('button:has-text("JA, RICHTIG"), button:has-text("Ja, richtig")').first();
    if (await jaRichtigBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await jaRichtigBtn.click();
        await page.waitForTimeout(1000);
    }

    // Alternativ: X Button des Popups
    const closePopup = page.locator('button[aria-label="close"], .market-selector__close, [data-testid="close-button"]').first();
    if (await closePopup.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closePopup.click();
        await page.waitForTimeout(500);
    }

    // Cookie Banner
    const cookieBtn = page.locator('button:has-text("Alle akzeptieren"), button:has-text("Akzeptieren")').first();
    if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
    }

    await page.waitForTimeout(2000);

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
