FROM node:20

WORKDIR /usr/src/app

ADD .yarnrc .yarnrc
COPY package*.json ./
RUN yarn config set strict-ssl false
RUN yarn config set unsafe-perm true
RUN yarn install --frozen-lockfile

ADD dist dist

USER 10001

CMD [ "node", "--max-old-space-size=3100", "--max-semi-space-size=32", "dist/main" ]
