# Using the latest long-term-support Ubuntu OS
FROM ubuntu:16.04

RUN apt -y update
RUN apt -y upgrade
RUN apt install -y software-properties-common
RUN add-apt-repository -y ppa:deadsnakes/ppa
RUN apt install -y vim man
RUN apt install -y tree curl
RUN ln -s /usr/bin/python3 /usr/bin/python
RUN curl -sS https://bootstrap.pypa.io/get-pip.py >>setup.py
RUN python setup.py

RUN pip install websockets

WORKDIR /home/oe/
ENV HOME=/home/oe/
COPY ./ /home/oe

# Make the 5000 port available from outside the container
EXPOSE 5000
