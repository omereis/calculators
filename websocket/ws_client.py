import asyncio
import websockets
import getopt, sys

host = 'localhost'
port = 8765

try:
    if len(sys.argv) > 0:
        print('ARGV      :', sys.argv[1:])
        options, remainder = getopt.getopt(
            sys.argv[1:],
            'h:p:',
            [
            'host=',
            'port='
            ])
except getopt.GetoptError as err:
    print(err) 
    exit(1)

for opt, arg in options:
    if opt in ('-h', '--host'):
        host = arg.strip();
    elif opt in ('-p', '--port'):
        port = arg.strip();

async def hello():
    address = 'ws://{}:{}'.format(host,port)
    print("Address: {}".format(address))
    async with websockets.connect(address) as websocket:
        name = input("What's your name? ")

        await websocket.send(name)
        print("name: {}".format(name))

        greeting = await websocket.recv()
        print("{}".format(greeting))

asyncio.get_event_loop().run_until_complete(hello())


