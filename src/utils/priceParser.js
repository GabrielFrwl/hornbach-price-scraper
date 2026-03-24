export function parsePrice(raw) {
    if (!raw) return null;
    const cleaned = raw
        .replace(/[€$£\s\u00a0]/g, '')
        .replace(/\.(?=\d{3})/g, '')
        .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

export async function safeWaitForSelector(page, selector, timeout = 5000) {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    } catch {
        return false;
    }
}
