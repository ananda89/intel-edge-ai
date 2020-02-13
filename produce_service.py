import sys
import schedule
import time
from daemon import Daemon
import config
from datetime import datetime
import os
import shutil
import video_produce
import logging

TRAINING_REFRESH_IN_MINUTE_FOR_PRODUCE_VIDEO = 1

TAG = 'video_produce'
logging.basicConfig(filename='video_produce.log', filemode='w', format='%(asctime)s - %(message)s')

def job():
    logging.debug('--------------------------------')
    logging.debug('--------------------------------')
    logging.debug('job running... ' + str(datetime.now()))
    video_produce.search_and_compress()
    logging.debug('--------------------------------')
    logging.debug('--------------------------------')


class ProduceVideoCode(object):

    def run(self):
        while True:

            job()
            schedule.every(TRAINING_REFRESH_IN_MINUTE_FOR_PRODUCE_VIDEO).minutes.do(job)

            while 1:
                schedule.run_pending()
                time.sleep(1)

def run():
    while True:

        job()
        schedule.every(TRAINING_REFRESH_IN_MINUTE_FOR_PRODUCE_VIDEO).minutes.do(job)

        while 1:
            schedule.run_pending()
            time.sleep(1)

# class MyDaemon(Daemon):
#     def run(self):
#         your_code = ProduceVideoCode()
#         your_code.run()


# if __name__ == "__main__":
#     daemon = MyDaemon('/tmp/produce.pid')
#     if len(sys.argv) == 2:
#         if 'start' == sys.argv[1]:
#             daemon.start()
#         elif 'stop' == sys.argv[1]:
#             daemon.stop()
#         elif 'restart' == sys.argv[1]:
#             daemon.restart()
#         else:
#             print("Unknown command")
#             sys.exit(2)
#         sys.exit(0)
#     else:
#         print("usage: %s start|stop|restart" % sys.argv[0])
#         sys.exit(2)
run()