import os
import config
import json
from db_manager import DB
from intel import inference


def extract_info(videopath):
    gender_predictions, emotion_predictions, imagenet_predictions = inference.main_with_params(videopath)
    tags = ''
    if len(gender_predictions) > 0:
        tags = max(gender_predictions) + ","

        if len(max(emotion_predictions) > 0):
            tags += str(max(emotion_predictions)) + ","

    for pred in list(set(imagenet_predictions)):
        tags = pred + ","


    return tags.rstrip(',')


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
                tags = 'null'
                try:
                    if (metadata['infoExtracted'] == 0):
                        with open(matadata_path, 'w') as jF:
                            metadata['infoExtracted'] = 1
                            jF.write(str(metadata))
                        tags = extract_info(videopath)
                except Exception as err:
                    print(err)
                    with open(matadata_path, 'w') as jF:
                        metadata['infoExtracted'] = 1
                        jF.write(str(metadata))
                    tags = extract_info(videopath)

                data = {
                    'status': 1,
                    'path': videopath,
                    'tags': 'male, suprised, person, tie',
                    'id': metadata['video_id']
                }

                manager.update_video(data)


    except Exception as err:
        print(err)

    return
