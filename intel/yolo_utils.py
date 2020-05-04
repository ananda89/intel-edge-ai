import numpy as np
import random
channelStride = 13 * 13
COL_COUNT = 13
RAW_COUNT = 13
CELL_WIDTH = 32
CELL_HEIGHT = 32
anchors = [1.08, 1.19, 3.42, 4.41, 6.63, 11.38, 9.42, 5.11, 16.62, 10.52]
BOX_INFO_FEATURE_COUNT = 5
BOXES_PER_CELL = 5
CHANNEL_COUNT = 425
CLASS_COUNT = 80
# '__background__',
labels = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic', 'fire', 'stop', 'parking', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports', 'kite', 'baseball', 'baseball', 'skateboard', 'surfboard', 'tennis', 'bottle', 'wine', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted', 'bed', 'dining', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy', 'hair', 'toothbrush']
colors = [ (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)) for label in labels]

def softmax(x):
    """Compute softmax values for each sets of scores in x."""
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=0)  # only difference


def GetOffset(x, y, channel):
    # // YOLO outputs a tensor that has a shape of 125x13x13, which
    # // WinML flattens into a 1D array.  To access a specific channel
    # // for a given (x,y) cell position, we need to calculate an offset
    # // into the array
    return (channel * channelStride) + (y * COL_COUNT) + x


def ExtractBoundingBoxDimensions(modelOutput, x, y, channel):
    X = modelOutput[GetOffset(x, y, channel)]
    Y = modelOutput[GetOffset(x, y, channel + 1)]
    Width = modelOutput[GetOffset(x, y, channel + 2)]
    Height = modelOutput[GetOffset(x, y, channel + 3)]
    tc = modelOutput[GetOffset(x, y, channel + 4)]
    return X, Y, Width, Height, tc


def sigmoid(value):
    return 1 / (1 + np.exp(-value))


def MapBoundingBoxToCell(x, y, box, boxDimensions):
    X = x + sigmoid(boxDimensions[0]) * CELL_WIDTH
    Y = y + sigmoid(boxDimensions[1]) * CELL_HEIGHT
    Width = np.exp(boxDimensions[2]) * CELL_WIDTH * anchors[box * 2]
    Height = np.exp(boxDimensions[3]) * CELL_HEIGHT * anchors[box * 2 + 1]
    confidence = sigmoid(boxDimensions[4])
    return X, Y, Width, Height, confidence


def ExtractClasses(modelOutput, x, y, channel):
    # float[] predictedClasses = new float[CLASS_COUNT];
    predictedClasses = []
    predictedClassOffset = channel + BOX_INFO_FEATURE_COUNT
    for predictedClass in range(CLASS_COUNT):
        predictedClasses.append(modelOutput[GetOffset(x, y, predictedClass + predictedClassOffset)])

    return softmax(np.array(predictedClasses))

threshold = 0.3
def detect_classes(layerOutputs, callback, shape):
    boxes = []
    predictions = []
    clrs = []
    for output in layerOutputs:
        # loop over each of the detections
        for row in range(RAW_COUNT):
            for column in range(COL_COUNT):
                for box in range(BOXES_PER_CELL):
                    # boxes.append(box)
                    channel = box * (CLASS_COUNT + BOX_INFO_FEATURE_COUNT)
                    boundingBoxDimensions = ExtractBoundingBoxDimensions(output.flatten(),
                                                                                    row,
                                                                                    column,
                                                                                    channel)

                    X, Y, Width, Height, confidence = MapBoundingBoxToCell(row, column, box,
                                                                           boundingBoxDimensions)
                    # Width = Width * shape[0]
                    # Height = Height * shape[1]

                    if (confidence < threshold):
                        continue
                    print('CONFIDENCE =>' + str(confidence))

                    classes = ExtractClasses(output.flatten(), row, column, channel)
                    # print(classes)
                    class_index = np.argmax(classes)
                    class_accuracy = classes[class_index]

                    if(class_accuracy < 0.7):
                        continue

                    print("Index " + str(class_index) + " Name " + str(labels[int(class_index)]) + " & accuracy " + str(
                        class_accuracy * 100))

                    # confidenceInClass = class_accuracy * confidence
                    if class_accuracy > 0.4:
                        print("ACCURATE = >" + str(class_index))
                        boxes.append((X, Y, Width, Height))
                        predictions.append(labels[int(class_index)])
                        clrs.append(colors[int(class_index)])

    callback(boxes, predictions, clrs)



# import re
# pattern = re.compile("\w+[a-b]*")
# with open('/home/hb/machinelearning/VideoCallSearch/intel-edge-ai/intel/pre-trained-models/onnx/fastcnn/ms_coco_labelmap.pbtxt', 'r') as file:
#     lines = file.readlines()
#     labels = [ re.findall(pattern, line)[2] for line in lines]
#     print(labels)