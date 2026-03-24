/**
 * Hornbach Scraper – direkt über GraphQL API
 * Kein Browser, kein Playwright – einfache HTTP Requests!
 */

const GRAPHQL_URL = 'https://www.hornbach.de/frontend/query?operationName=PriceAndDeliveryInfo&fitlocale=de-DE';

const PRICE_QUERY = `query PriceAndDeliveryInfo($abstractProductId: String!, $concreteProductId: String!, $quantity: Int!, $amount: Float, $productMeasurementUnitCode: String!, $offerReference: String!) {
  productPriceAndDeliveryInfo(
    input: {abstractProductId: $abstractProductId, concreteProductId: $concreteProductId, quantity: $quantity, amount: $amount, offerReference: $offerReference, productMeasurementUnitCode: $productMeasurementUnitCode}
  ) {
    ...PriceAndDeliveryTotal
    ...PriceAndDeliveryBuyBoxDV
    __typename
  }
}

fragment PriceAndDeliveryBuyBoxDV on ProductPriceAndDeliveryInfo {
  shippingCost
  __typename
}

fragment PriceAndDeliveryTotal on ProductPriceAndDeliveryInfo {
  totalPrice {
    price
    currency
    __typename
  }
  __typename
}`;

const PRODUCT_NAME_URL = 'https://www.hornbach.de/frontend/query?operationName=ProductName&fitlocale=de-DE';

const NAME_QUERY = `query ProductName($abstractProductId: String!) {
  abstractProduct(abstractProductId: $abstractProductId) {
    name
    __typename
  }
}`;

/**
 * @param {string} articleId - Hornbach Artikel-Nr. z.B. "3829333"
 * @param {object} log
 */
export async function scrapeHornbach(articleId, log) {
    log.info(`Hornbach API: Fetching price for article ${articleId}`);

    const offerReference = `DE850_${articleId}_ST`;

    // 1. Preis abrufen
    const priceRes = await fetch(GRAPHQL_URL, {
        method: 'POST',
headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, */*',
    'Accept-Language': 'de-DE,de;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://www.hornbach.de',
    'Referer': 'https://www.hornbach.de/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
},
        body: JSON.stringify([{
            operationName: 'PriceAndDeliveryInfo',
            query: PRICE_QUERY,
            variables: {
                abstractProductId: articleId,
                concreteProductId: '',
                quantity: 1,
                offerReference,
                productMeasurementUnitCode: 'ST',
                amount: null,
            },
            extensions: {
                clientLibrary: { name: '@apollo/client', version: '4.1.6' },
            },
        }]),
    });

    if (!priceRes.ok) {
        throw new Error(`Hornbach API error: ${priceRes.status}`);
    }

    const priceData = await priceRes.json();
    const priceInfo = priceData?.[0]?.data?.productPriceAndDeliveryInfo;

    if (!priceInfo) {
        log.warning(`Hornbach: No price found for article ${articleId}`);
        return null;
    }

    const price = priceInfo.totalPrice?.price ?? null;
    const currency = priceInfo.totalPrice?.currency ?? '€';

    // 2. Produktname abrufen
    let productName = null;
    try {
        const nameRes = await fetch(PRODUCT_NAME_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Language': 'de-DE,de;q=0.9',
                'Origin': 'https://www.hornbach.de',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify([{
                operationName: 'ProductName',
                query: NAME_QUERY,
                variables: { abstractProductId: articleId },
                extensions: {
                    clientLibrary: { name: '@apollo/client', version: '4.1.6' },
                },
            }]),
        });
        const nameData = await nameRes.json();
        productName = nameData?.[0]?.data?.abstractProduct?.name ?? null;
    } catch (e) {
        log.warning(`Hornbach: Could not fetch product name for ${articleId}: ${e.message}`);
    }

    return {
        articleId,
        shop: 'hornbach',
        productName,
        price,
        currency: currency === '€' ? 'EUR' : currency,
        productUrl: `https://www.hornbach.de/p/artikel/${articleId}/`,
        inStock: price !== null,
        scrapedAt: new Date().toISOString(),
    };
}
