import os

VID_RESOLUTION = '720x480'  # '720x480'
NUMBER_OF_CORES = 1
FPS = 25
data_dir = os.path.join(os.curdir, 'signaling/videos')
if not os.path.exists(data_dir):
    os.mkdir(data_dir)

produced_data_dir = os.path.join(os.curdir, 'signaling/produce')
if not os.path.exists(produced_data_dir):
    os.mkdir(produced_data_dir)


COMPRESS_PENDING_DURATION_IN_MINUTE = 5
