
# Fetching the latest node image on apline linux
FROM node:18-alpine AS build-stage

# Declaring env
ENV DOMAIN=http://localhost:5000

# Setting up the work directory
WORKDIR /usr/src/app

# Setting up the work directory
COPY ./package.json ./yarn.lock ./

RUN yarn

# Copying all the files in our project
COPY . .

# Building our application
RUN yarn build

# Fetching the latest node image
FROM node:18-alpine AS production-stage

# Copying built assets from builder
COPY --from=build-stage /usr/src/app/dist ./dist
COPY --from=build-stage /usr/src/app/node_modules ./node_modules
CMD [ "node", "./dist/main.js" ]

# CMD yarn "start:prod"

