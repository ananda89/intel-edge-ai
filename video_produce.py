import os
import shutil
from werkzeug.utils import secure_filename
import config
import time
from datetime import datetime
import json
import gc
import logging

# Create a custom logger
logger = logging.getLogger(__name__)
logging.basicConfig(filename='video_produce.log', filemode='w', format='%(asctime)s - %(message)s')
# ffmpeg -i <inputfilename> -s 640x480 -b:v 512k -vcodec mpeg1video -acodec copy <outputfilename>
# ffmpeg -i 2019-11-04T110335.425Z.webm -s 720x480 -strict -2 file.mp4
# thread + frame => #ffmpeg -i 38-107.mp4 -s 720x480 -strict -2 -filter:v fps=fps=25 -threads 8 file.mp4
from threads import CompressVideoThread



def compress(videofolder, producedvideofolder, videoname, metadata):
    try:
        logging.debug('Compressing Started => ' + videoname)
        save_path = os.path.join(producedvideofolder, secure_filename(videoname + '.mp4'))
        chunks = sorted(os.listdir(videofolder))
        for video in chunks:
            if video.__contains__('.json'):
                continue
            raw_video = os.path.join(videofolder, video)
            # cmd = 'ffmpeg -i ' + raw_video + ' -s ' + config.VID_RESOLUTION + ' -strict -2 '
            cmd = 'ffmpeg -i ' + raw_video + ' -s ' + config.VID_RESOLUTION \
                  + ' -strict -2 -filter:v fps=fps=' + str(config.FPS) \
                  + ' -threads ' + str(config.NUMBER_OF_CORES) + ' ' + save_path

            logging.debug(cmd)
            # saving metadata to check worker to compressing in process or done then upload the video
            save_path = os.path.join(producedvideofolder, 'metadata.json')
            with open(save_path, 'w') as f:
                metadata['isCompressingDone'] = 0
                f.write(str(metadata))

            if os.system(cmd) == 0:  # success
                with open(save_path, 'w') as f:
                    metadata['isCompressingDone'] = 1
                    f.write(str(metadata))

                shutil.rmtree(videofolder)  # removing whole raw dir
                logging.debug('Compressing Complete => ' + producedvideofolder)
                # upload(producedvideofolder, bucket, producedvideofolder.replace(config.produced_data_dir, ''))
            else:
                logging.debug('Error in ffmpeg compressing so uploading raw video ' + videofolder)
                # upload(videofolder, bucket, videofolder.replace(config.data_dir, ''))
                with open(save_path, 'w') as f:
                    metadata['isCompressingDone'] = 99
                    f.write(str(metadata))
    except Exception as err:
        logging.debug(err)



def execute_all_threads(multithreads):
    previous = 0
    for j in range(0, len(multithreads), config.NUMBER_OF_CORES):  # 4 is number of core
        for n in range(previous, j):
            # print('execute -> ' + str(n))
            multithreads[n].start()
        previous = j

    # Executing remaining threads
    for n in range(previous, len(multithreads)):
        # print('execute -> ' + str(n))
        multithreads[n].start()

    # joining all threads for completion
    for i in range(len(multithreads)):
        multithreads[i].join()


def search_and_compress():
    videodir = os.listdir(config.data_dir)
    multithreads = []  # appedning compressing threads here to be executed parallel
    ecount = 1
    try:
        for videoname in videodir:
            videofolder = os.path.join(config.data_dir, videoname)
            producedvideofolder = os.path.join(config.produced_data_dir, videoname)

            if not os.path.exists(producedvideofolder):
                os.mkdir(producedvideofolder)

            matadata_path = os.path.join(videofolder, 'metadata.json')

            # print(time.time() - time.ctime(os.path.getmtime(matadata_path)))
            with open(matadata_path, 'r') as jF:
                s = jF.read()
                s = s.replace("'", '"')
                metadata = json.loads(s)

            if (bool(int(metadata['isRecordingStopped']))):
                if (int(metadata['isCompressingStarted']) == 0):
                    # compress(videofolder, producedvideofolder, videoname, metadata)
                    multithreads.append(
                        CompressVideoThread(videofolder,
                                            producedvideofolder,
                                            videoname,
                                            metadata,
                                            matadata_path, ecount))
                else:
                    logging.debug('Compression process is in process => ' + videofolder)

            else:
                # wait for one hour duration then convert and upload
                last_modified_time = datetime.strptime(time.ctime(os.path.getmtime(matadata_path)),
                                                       '%a %b %d %H:%M:%S %Y')
                now = datetime.now()  # Now
                duration = now - last_modified_time  # For build-in functions
                duration_in_s = duration.total_seconds()
                minutes = divmod(duration_in_s, 60)[0]  # Duration in minutes
                if (minutes > config.COMPRESS_PENDING_DURATION_IN_MINUTE):
                    logging.debug(str(
                        minutes) + ' minutes excceed, Produced this uncomplete video and upload =>' + videofolder)
                    if (int(metadata['isCompressingStarted']) == 0):
                        # compress(videofolder, producedvideofolder, videoname, metadata)
                        multithreads.append(
                            CompressVideoThread(videofolder,
                                                producedvideofolder,
                                                videoname,
                                                metadata,
                                                matadata_path,
                                                ecount))
                    else:
                        logging.debug('Compression process is in process => ' + videofolder)
                else:
                    logging.debug('Compression Pending as recording not stopped yet => ' + videofolder)

        execute_all_threads(multithreads)
        logging.debug('All Compression Threads Complete')
        gc.collect()

    except Exception as err:
        logging.debug(err)


# search_and_compress()
# compress('/home/hb/demos/MediaUploadPy/produce/32a', '/home/hb/demos/MediaUploadPy/produce/', 'videoname', None)