from gpiozero import MotionSensor
import Adafruit_GPIO.SPI as SPI
import Adafruit_MCP3008
from NodeSocket import NodeSocket

motion = MotionSensor(4)
print("Connection to MotionSensor initiated")

CLK = 11
MISO = 9
MOSI = 10
CS = 8
mcp = Adafruit_MCP3008.MCP3008(clk=CLK, cs=CS, miso=MISO, mosi=MOSI)
print("Connection to MCP3008 initiated")

socket = NodeSocket.NodeSocket()
print("NodeSocket initiated")


def main():
    volts = mcp.read_adc(0)

    for _ in range(0, 1000):
        v = mcp.read_adc(0)
        if v > volts:
            volts = v

    dist = volt_to_dist(volts)

    if dist <= 50:
        msg = "dist: " + str(dist)
        socket.write('channel_2', msg)
        print(msg)


def volt_to_dist(v):
    v = (v / 1023.0) * 3.3
    dist = (16.2537 * (v**4)) - (129.893 * (v**3)) + \
        (382.268 * (v**2)) - (512.611 * v) + 301.439
    return dist


motion.when_activated = main

while True:
    socket.isOpen()
    # motion.wait_for_active()
