# Leichtes Node.js Image – kein Playwright/Chrome nötig!
FROM apify/actor-node:20

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Packages installed"

COPY . ./

CMD npm start
