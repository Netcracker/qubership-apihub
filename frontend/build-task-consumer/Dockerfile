FROM docker.io/node:20 as builder

WORKDIR /workspace

COPY src src
COPY package*.json ./
COPY tsconfig*.json ./

# for local machine build
#COPY .npmrc .npmrc
#RUN npm ci && npm run build --if-present

# for build via GitHub actions
RUN --mount=type=secret,id=npmrc,target=.npmrc npm ci && npm run build --if-present

FROM docker.io/node:20

WORKDIR /usr/src/app

COPY --from=builder /workspace/dist dist

USER 10001

CMD [ "node", "--max-old-space-size=3100", "--max-semi-space-size=32", "dist/main" ]