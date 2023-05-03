# From https://github.com/hellodeibu/docker-multistep-nodejs-build

#################################################################
# Step 1: Initial build using the `yarn build` command          #
#################################################################
# Note: Make sure the right version of node your application    #
# requires is set here and in all other build steps.            #
#################################################################
FROM node:20 as build

# Prepare the build directory
RUN mkdir -p /opt/build;

WORKDIR /opt/build

# If your build step requires environment variables too, add them here

# Copy required files
# Note: I specify each file directly here to avoid copying over
# existing /dist folder or other dev files like .env
COPY ./src ./src
COPY [ "package.json", "yarn.lock", "tsconfig.json", "./" ]

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN yarn install --no-progress && yarn build


#################################################################
# Step 2: Fetch production-only dependencies                    #
#################################################################
# Note: Make sure the right version of node your application    #
# requires is set here and in all other build steps.            #
#################################################################
FROM node:20 as dependencies

# Set environment to production
ENV NODE_ENV='production'

RUN mkdir -p /opt/build;

WORKDIR /opt/build

COPY --from=build [ "/opt/build/package.json", "/opt/build/yarn.lock", "./" ]

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN yarn install --production=true --no-progress


#################################################################
# Step 3: Build done, create the deployable/runnable image step #
#################################################################
# Note: Make sure the right version of node your application    #
# requires is set here and in all other build steps.            #
#################################################################
FROM node:20-slim as release

# Based on https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# If running Docker >= 1.13.0 use docker run's --init arg to reap zombie processes, otherwise
# uncomment the following lines to have `dumb-init` as PID 1
# ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_x86_64 /usr/local/bin/dumb-init
# RUN chmod +x /usr/local/bin/dumb-init
# ENTRYPOINT ["dumb-init", "--"]

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser

# Run everything after as non-privileged user.
USER pptruser

# Set environment to production
ENV NODE_ENV=production \
    PUPPETEER_DOCKER=true

# Prepare the app directory
RUN mkdir -p /home/pptruser/app;

WORKDIR /home/pptruser/app

# Copy dependencies and compiled application from previous steps
COPY --from=dependencies /opt/build/node_modules /home/pptruser/app/node_modules
COPY --from=build /opt/build/dist /home/pptruser/app/dist

# Run the application using node
ENTRYPOINT [ "node", "dist/index.js" ]

# Alternatively: Run your application using Forever (ensure this is installed as a dependency first)
# See: https://github.com/foreversd/forever
# ENTRYPOINT [ "./node_modules/.bin/forever", "./dist/index.js" ]