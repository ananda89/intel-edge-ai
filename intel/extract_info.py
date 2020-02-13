import os
import config
import json
from db_manager import DB

def extract_info(metadata, videopath):
    return

def search_and_extract(manager):
    manager = DB()
    videodir = os.listdir(config.produced_data_dir)

    multithreads = []  # appedning compressing threads here to be executed parallel
    ecount = 1
    try:
        for videoname in videodir:
            # videoname == invite_id
            videofolder = os.path.join(config.produced_data_dir, videoname)
            videofiles = [filename for filename in os.listdir(videofolder) if filename.__contains__('.mp4')]

            matadata_path = os.path.join(videofolder, 'metadata.json')
            with open(matadata_path, 'r') as jF:
                s = jF.read()
                s = s.replace("'", '"')
                metadata = json.loads(s)
                print(metadata)

            for video in videofiles:
                videopath = os.path.join(videofolder, video)
                data = {
                    'status': 1,
                    'path': videopath,
                    'tags': 'null',
                    'id': metadata['video_id']
                }

                manager.update_video(data)

                if (metadata['infoExtracted'] == 0):
                    with open(matadata_path, 'w') as jF:
                        metadata['infoExtracted'] = 1
                        jF.write(str(metadata))

                extract_info(metadata, videopath)

    except Exception as err:
        print(err)

    return
