# syntax=docker/dockerfile:1
FROM node:20.11 as builder

ENV NODE_ENV=production
WORKDIR /app
# COPY ./package*.json .
# COPY ./yarn.lock .
# COPY ./.npmrc .
# ENV NODE_ENV=development
# RUN yarn install
COPY . .
RUN yarn build

# FROM node:20.11

# WORKDIR /app
# COPY ./package*.json .
# COPY ./yarn.lock .
# COPY ./.npmrc .
# RUN yarn install
# COPY --from=builder ./app/dist ./dist

VOLUME [ "/app/data" ]
EXPOSE 3000

ENV PORT="3000"
ENV DEBUG="satellite,satellite:*"

ENTRYPOINT [ "node", "." ]
