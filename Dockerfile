#
#  ApcUPS.js Dockerfile
#
FROM node:alpine

RUN mkdir /mqtt
RUN mkdir /mqtt/config
WORKDIR /mqtt

ADD package.json /mqtt/
RUN npm install

# install 'apcupsd'
RUN apk update && apk add --no-cache apcupsd openrc
# RUN rm -f /etc/apcupsd/apcupsd.conf

ADD apcupsd.conf /etc/apcupsd/
# RUN rc-service apcupsd start

# add app files & start
COPY app.js /mqtt
COPY startup.sh /mqtt

ADD VERSION .
ADD Dockerfile .
ADD build_container.sh .

CMD [ "./startup.sh" ]
