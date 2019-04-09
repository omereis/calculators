docker rm -f wsock_server
docker build --rm -f wsock.dockerfile -t wsock_server .
docker run -it -d --name wsock_server -p 8765:8765 wsock_server
rem docker run -it -d --name docker_refsrv
docker exec -it wsock_server bash