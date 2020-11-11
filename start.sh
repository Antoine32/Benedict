cd /home/pi/Benedict

git pull

tmux \
  new-session -d -s Benedict "node botB.js ; read" \; \
  select-layout even-vertical

sleep 30s

tmux \
  new-session -d -s Sensor "python3 sensor.py ; read" \; \
  select-layout even-vertical
