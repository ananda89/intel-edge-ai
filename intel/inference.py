import argparse
import time
import cv2
import imutils
import os
# import config
import numpy as np
from intel.network import Network
from imutils.video import FPS

# 'source /opt/intel/openvino/bin/setupvars.sh -pyver 3.5'
CASCADE_PATH = '/home/mayur/machinelearning/intel-edge-ai/models/haarcascade_frontalface_alt2.xml'

cascade = cv2.CascadeClassifier(CASCADE_PATH)

CPU_EXTENSION = "/opt/intel/openvino/deployment_tools/inference_engine/lib/intel64/libcpu_extension_sse4.so"
CPU_EXTENSION = None
from datetime import datetime
from intel import yolo_utils


def pre_process(frame, net_input_shape):
    p_frame = cv2.resize(frame, (net_input_shape[3], net_input_shape[2]))
    p_frame = p_frame.transpose(2, 0, 1)
    # p_frame = np.expand_dims(p_frame, axis=1)
    p_frame = p_frame.reshape(1, *p_frame.shape)
    return p_frame


def get_faces(frame):
    faces = cascade.detectMultiScale(frame,
                                     scaleFactor=1.1,
                                     minNeighbors=3)
    if len(faces) >= 1:
        return faces
    else:
        return []


def process_on_face(face, frame):
    x = face[0] - 20
    y = face[1] - 20
    w = face[2] + 20
    h = face[3] + 20

    face_frame = frame[y: y + h, x:x + w]
    # cv2.imshow('face', face_frame)
    # cv2.waitKey(0)

    return face_frame, face
    # return pre_process()


def extract_on_video(args):
    plugin = Network()
    emotion_plugin = Network()
    imagenet_plugin = Network()

    # load the model
    plugin.load_model(args.m, args.d, CPU_EXTENSION)
    emotion_plugin.load_model(args.em, args.d, CPU_EXTENSION)
    imagenet_plugin.load_model(args.obj, args.d, CPU_EXTENSION)
    print('Model Loaded !!!')

    emo_labels = ['neutral', 'happy', 'sad', 'surprise', 'anger']

    net_input_shape = plugin.get_input_shape()
    net_emo_input_shape = emotion_plugin.get_input_shape()
    net_obj_input_shape = imagenet_plugin.get_input_shape()

    # Define the codec and create VideoWriter object
    cap = cv2.VideoCapture(args.i)
    # fps = FPS().start()

    imagenet_predictions = []
    emotion_predictions = []
    gender_predictions = []

    # Capture frame-by-frame
    while (cap.isOpened()):
        isPending, frame = cap.read()
        width = int(cap.get(3))
        height = int(cap.get(4))

        if not isPending:
            break

        try:
            faces = get_faces(frame)
            if (len(faces) > 0):
                for face in faces:
                    p_frame, face = process_on_face(face, frame)
                    face_frame = pre_process(p_frame, net_input_shape)
                    emo_frame = pre_process(p_frame, net_emo_input_shape)

                    # cv2.rectangle(frame, (face[0], face[1]), (face[0] + face[2], face[1] + face[3]), (0, 255, 0), 2)

                    # p_frame = pre_process(frame, net_input_shape)
                    # time.sleep(0.03)
                    # k = cv2.waitKey(30)
                    # Perform inference on the frame
                    plugin.async_inference(face_frame)
                    emotion_plugin.async_inference(emo_frame)

                    if (emotion_plugin.wait() == 0):
                        result = emotion_plugin.extract_all_output()
                        em_index = np.argmax(result['prob_emotion'][0])
                        em_proba = result['prob_emotion'][0][em_index][0][0] * 100
                        emo_pred = str(emo_labels[em_index]) + ':' + str(em_proba)
                        emotion_predictions.append(str(emo_labels[em_index]))
                        # cv2.putText(frame, emo_pred[:10], (face[0], face[1] + face[3] + 25), config.font,
                        #             config.fontScale, config.emocolor, config.thickness, cv2.LINE_AA)
                        # print(emo_pred[:10] + 'TODO')

                    # Get the output of inference
                    if plugin.wait() == 0:
                        result = plugin.extract_all_output()
                        age = result['age_conv3'][0][0][0][0] * 100
                        gender = ''
                        if result['prob'][0][1][0][0] > result['prob'][0][0][0][0]:
                            # gender = 'Male ' + str(result['prob'][0][1][0][0] * 100)
                            gender = 'Male'
                        else:
                            # gender = 'Female ' + str(result['prob'][0][0][0][0] * 100)
                            gender = 'Female'

                        ans = "Age :" + str(age)[:5] + " & G:" + gender[:10]
                        gender_predictions.append(gender)
                        # cv2.putText(frame, ans, (face[0], face[1]), config.font,
                        #             config.fontScale, config.color, config.thickness, cv2.LINE_AA)
                        # print(ans + 'TODO')


            obj_frame = pre_process(frame, net_obj_input_shape)
            imagenet_plugin.async_inference(obj_frame)
            if (imagenet_plugin.wait() == 0):
                result = imagenet_plugin.extract_all_output()
                layerOutputs = result['convolution22']

                # loop over each of the layer outputs

                def callback(boxes, predictions, colors):
                    for (box, prediction, color) in zip(boxes, predictions, colors):
                        fH, fW, fCH =  frame.shape
                        scale = np.min([net_obj_input_shape[2]/fH, net_obj_input_shape[3]/fW])
                        print(box)
                        # x = int(box[0] * scale)
                        # y = int(box[1] * scale)
                        # w = int(x + box[2])
                        # h = int(y + box[3])
                        print(scale)
                        print('INPUT SHAPE '+ str(frame.shape))
                        print('BOX SHAPE '+ str(net_obj_input_shape))
                        print('OBJ SHAPE' + str(obj_frame.shape))
                        x = int(box[0] * width)
                        y = int(box[1] * height)
                        w = int(box[2])
                        h = int(box[3])


                        # print((x, y, w, h))
                        start_point = (x, y)
                        end_point = (w, h)
                        # cv2.putText(frame, prediction, (start_point[0] - 5, start_point[1] -5), cv2.FONT_HERSHEY_SIMPLEX ,
                        #             0.7, color, 2, cv2.LINE_AA)
                        # cv2.rectangle(frame, start_point, end_point, color, 2)
                        # cv2.imshow('image', frame)
                        # cv2.waitKey(0)
                        imagenet_predictions.append(prediction)

                yolo_utils.detect_classes(layerOutputs, callback, (720, 1280))

            # fps.update()


        except Exception as err:
            print(err)

    # stop the timer and display FPS information
    # fps.stop()
    # print("[INFO] elasped time: {:.2f}".format(fps.elapsed()))
    # print("[INFO] approx. FPS: {:.2f}".format(fps.fps()))

    ### TODO: Close the stream and any windows at the end of the application
    # When everything done, release the capture
    cap.release()
    return gender_predictions, emotion_predictions, imagenet_predictions

def infer_on_video(args):
    plugin = Network()
    emotion_plugin = Network()
    imagenet_plugin = Network()

    # load the model
    plugin.load_model(args.m, args.d, CPU_EXTENSION)
    emotion_plugin.load_model(args.em, args.d, CPU_EXTENSION)
    imagenet_plugin.load_model(args.obj, args.d, CPU_EXTENSION)
    print('Model Loaded !!!')

    emo_labels = ['neutral', 'happy', 'sad', 'surprise', 'anger']

    net_input_shape = plugin.get_input_shape()
    net_emo_input_shape = emotion_plugin.get_input_shape()
    net_obj_input_shape = imagenet_plugin.get_input_shape()

    # Define the codec and create VideoWriter object
    cap = cv2.VideoCapture(args.i)
    fps = FPS().start()

    counter = 0
    # Capture frame-by-frame
    lasttime = datetime.now()
    last_second = -1
    while (cap.isOpened()):
        isPending, frame = cap.read()
        width = int(cap.get(3))
        height = int(cap.get(4))

        if not isPending:
            break

        diff_time = datetime.now() - lasttime
        if (diff_time.seconds > last_second):  # process frame on each one second
            last_second = diff_time.seconds
            # print(diff_time.seconds)

        try:
            faces = get_faces(frame)
            if (len(faces) > 0):
                for face in faces:
                    p_frame, face = process_on_face(face, frame)
                    face_frame = pre_process(p_frame, net_input_shape)
                    emo_frame = pre_process(p_frame, net_emo_input_shape)

                    cv2.rectangle(frame, (face[0], face[1]), (face[0] + face[2], face[1] + face[3]), (0, 255, 0), 2)

                    # p_frame = pre_process(frame, net_input_shape)
                    # time.sleep(0.03)
                    # k = cv2.waitKey(30)
                    # Perform inference on the frame
                    plugin.async_inference(face_frame)
                    emotion_plugin.async_inference(emo_frame)

                    if (emotion_plugin.wait() == 0):
                        result = emotion_plugin.extract_all_output()
                        em_index = np.argmax(result['prob_emotion'][0])
                        em_proba = result['prob_emotion'][0][em_index][0][0] * 100
                        emo_pred = str(emo_labels[em_index]) + ':' + str(em_proba)
                        cv2.putText(frame, emo_pred[:10], (face[0], face[1] + face[3] + 25), cv2.FONT_HERSHEY_COMPLEX,
                                    1, (100,200,100), 1, cv2.LINE_AA)
                        # print(emo_pred[:10] + 'TODO')

                    # Get the output of inference
                    if plugin.wait() == 0:
                        result = plugin.extract_all_output()
                        age = result['age_conv3'][0][0][0][0] * 100
                        gender = ''
                        if result['prob'][0][1][0][0] > result['prob'][0][0][0][0]:
                            gender = 'Male ' + str(result['prob'][0][1][0][0] * 100)
                        else:
                            gender = 'Female ' + str(result['prob'][0][0][0][0] * 100)

                        ans = "Age :" + str(age)[:5] + " & G:" + gender[:10]
                        cv2.putText(frame, ans, (face[0], face[1]), cv2.FONT_HERSHEY_COMPLEX,
                                    1, (10,10,255), 1, cv2.LINE_AA)

            obj_frame = pre_process(frame, net_obj_input_shape)
            imagenet_plugin.async_inference(obj_frame)
            if (imagenet_plugin.wait() == 0):
                result = imagenet_plugin.extract_all_output()
                layerOutputs = result['convolution22']

                # loop over each of the layer outputs

                def callback(boxes, predictions, colors):
                    for (box, prediction, color) in zip(boxes, predictions, colors):
                        fH, fW, fCH =  frame.shape
                        scale = np.min([net_obj_input_shape[2]/fH, net_obj_input_shape[3]/fW])
                        print(box)
                        # x = int(box[0] * scale)
                        # y = int(box[1] * scale)
                        # w = int(x + box[2])
                        # h = int(y + box[3])
                        print(scale)
                        print('INPUT SHAPE '+ str(frame.shape))
                        print('BOX SHAPE '+ str(net_obj_input_shape))
                        print('OBJ SHAPE' + str(obj_frame.shape))
                        x = int(box[0] * width)
                        y = int(box[1] * height)
                        w = int(box[2])
                        h = int(box[3])


                        # print((x, y, w, h))
                        start_point = (x, y)
                        end_point = (w, h)
                        cv2.putText(frame, prediction, (start_point[0] - 5, start_point[1] -5), cv2.FONT_HERSHEY_SIMPLEX ,
                                    0.7, color, 2, cv2.LINE_AA)
                        cv2.rectangle(frame, start_point, end_point, color, 2)
                        # cv2.imshow('image', frame)
                        # cv2.waitKey(0)

                yolo_utils.detect_classes(layerOutputs, callback, (720, 1280))

            fps.update()


        except Exception as err:
            print(err)

        cv2.imshow('output', imutils.resize(frame, width=700))

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # stop the timer and display FPS information
    fps.stop()
    print("[INFO] elasped time: {:.2f}".format(fps.elapsed()))
    print("[INFO] approx. FPS: {:.2f}".format(fps.fps()))

    ### TODO: Close the stream and any windows at the end of the application
    # When everything done, release the capture
    cap.release()
    cv2.destroyAllWindows()


def get_args():
    '''
    Gets the arguments from the command line.
    '''
    parser = argparse.ArgumentParser("Run inference on an input video")
    # -- Create the descriptions for the commands
    m_desc = "The location of the model XML file"
    i_desc = "The location of the input file"
    d_desc = "The device name, if not 'CPU'"

    # -- Add required and optional groups
    parser._action_groups.pop()
    required = parser.add_argument_group('required arguments')
    optional = parser.add_argument_group('optional arguments')

    # -- Create the arguments
    required.add_argument("-m", help=m_desc, required=False)
    optional.add_argument("-i", help=i_desc, default='')
    optional.add_argument("-d", help=d_desc, default='CPU')
    args = parser.parse_args()

    return args

def main():
    args = get_args()
    args.i = '/home/mayur/Downloads/test (3).webm'
    args.m = os.path.join(os.getcwd(),'pre-trained-models/caffe/intel/age-gender-recognition-retail-0013/FP32/age-gender-recognition-retail-0013.xml')
    args.em = os.path.join(os.getcwd(),'pre-trained-models/emotions/intel/emotions-recognition-retail-0003/FP32/emotions-recognition-retail-0003.xml')
    args.obj = os.path.join(os.getcwd(),'pre-trained-models/onnx/fastcnn/yolov2.xml')
    args.o = 'out.avi'
    infer_on_video(args)

def main_with_params(videopath):
    args = get_args()
    args.i = videopath
    args.m = os.path.join(os.getcwd(),'intel/pre-trained-models/caffe/intel/age-gender-recognition-retail-0013/FP32/age-gender-recognition-retail-0013.xml')
    args.em = os.path.join(os.getcwd(),'intel/pre-trained-models/emotions/intel/emotions-recognition-retail-0003/FP32/emotions-recognition-retail-0003.xml')
    args.obj = os.path.join(os.getcwd(),'intel/pre-trained-models/onnx/fastcnn/yolov2.xml')
    args.o = 'out.avi'
    return extract_on_video(args)

#
# if __name__ == "__main__":
#     main()

# If
