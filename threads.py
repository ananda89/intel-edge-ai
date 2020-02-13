# Python multithreading example to print current date.
# 1. Define a subclass using Thread class.
# 2. Instantiate the subclass and trigger the thread.

from threading import Thread


class CompressVideoThread(Thread):
    def __init__(self, videofolder, producedvideofolder, videoname, metadata, matadata_path, counter):
        Thread.__init__(self)
        self.videofolder = videofolder
        self.threadID = counter
        self.producedvideofolder = producedvideofolder
        self.videoname = videoname
        self.metadata = metadata
        self.matadata_path = matadata_path
        self.counter = counter

    def run(self):
        # print_date(self.name, self.counter)
        from video_produce import compress
        compress(self.videofolder, self.producedvideofolder, self.videoname, self.metadata)
        try:
            with open(self.matadata_path, 'w') as jF:
                self.metadata['isCompressingStarted'] = 1
                jF.write(str(self.metadata))
        except Exception as err:
            print(err)


# class UploadVideoThread(Thread):
#     def __init__(self, producedvideofolder, bucket, videofoldername, metadata, counter):
#         Thread.__init__(self)
#         self.producedvideofolder = producedvideofolder
#         self.bucket = bucket
#         self.videofoldername = videofoldername
#         self.metadata = metadata
#         self.counter = counter
#
#     def run(self):
#         # print_date(self.name, self.counter)
#
#         try:
#             if (self.metadata['csd_media_upload_to'] == 'SFTP'):
#                 print('Upload to SFTP')
#                 from sftp_uploader import uploadFolder
#                 uploadFolder(self.producedvideofolder, self.metadata)
#             else:
#                 from video_upload import upload
#                 upload(self.producedvideofolder, self.bucket, self.videofoldername, self.metadata)
#         except Exception as err:
#             print(err)
#             pass
