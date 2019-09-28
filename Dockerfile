FROM node:10-slim
RUN apt-get update &&\
    apt-get install -y libgtk-3-0 libgconf-2-4 \
    libasound2 libxtst6 libxss1 libnss3 xvfb
WORKDIR /app
COPY entrypoint /
RUN chmod +x /entrypoint
ENTRYPOINT ["/entrypoint"]
COPY package.json /app
RUN npm i
EXPOSE 3001
COPY . /app
CMD xvfb-run --server-args="-screen 0 1024x768x24" npm start