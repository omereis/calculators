import asyncio
import websockets
import getopt, sys
from time import sleep
import datetime

#------------------------------------------------------------------------------
#host = 'localhost'
host = 'NCNR-R9nano.campus.nist.gov'
port = 8765
#------------------------------------------------------------------------------
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
#------------------------------------------------------------------------------
for opt, arg in options:
    if opt in ('-h', '--host'):
        host = arg.strip();
    elif opt in ('-p', '--port'):
        port = arg.strip();
#------------------------------------------------------------------------------
def save_message (message):
    file = open ("messages.txt", "a+")
    file.write (message + "\n")
    file.close()
#------------------------------------------------------------------------------
async def hello(websocket, path):
    message = await websocket.recv()
    strTime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    save_message(strTime + ': '+ message)
#    save_message(message)
    source = "{}:{}".format(websocket.host, websocket.port)
    print ("Just got a message from...")
    try:
        print ("    client in {}".format(source))
    except Exception as e:
        print('Oops: {}'.format(e.message))
    print(" {}".format(message))
    greeting = "Hello {}, from {}:{}!".format(message, host, port)
    sleep(1)
    await websocket.send(greeting)
    print(greeting)
#------------------------------------------------------------------------------
print('Host: {}'.format(host))
print('Port: {}'.format(port))
start_server = websockets.serve(hello, host, port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()



