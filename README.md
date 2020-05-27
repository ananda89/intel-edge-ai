# Video Search Engine

Step 1: Create Virtual Enviorment

        python3 -m venv venv

Step 2: Install OpenVino ToolKit

        https://software.intel.com/content/www/us/en/develop/tools/openvino-toolkit/choose-download.html
            
Step 3: Check intel/pre-trained-models/ folder. If not exists then download pretrained models from following link and place it under intel/ folder

        https://www.dropbox.com/sh/mfng3vj2r1yutzo/AABLc3wFhhwYqEjtV8v5Dvsja?dl=0
        
Step 4: Activate OpenVino Enviorment & Virtual Enviorment
    
        source /opt/intel/openvino/bin/setupvars.sh
        source venv/bin/activate

Step 5: Install Dependencies through pip

        pip install -r requirements.txt

Step 6: Install node and npm.
 
        npm == 6.14.4
        node == 12.16.2
        from https://websiteforstudents.com/how-to-install-node-js-10-11-12-on-ubuntu-16-04-18-04-via-apt-and-snap/


Step 7: Download node modules

        cd signaling
        npm install (only first time to download dependencies)
        
Step 8: Run Signaling Sever through following commands in new terminal
        
        cd signaling
        node server.js
        
Step 9: Run Video Uploading Server throw following commands in new terminal

        cd signaling
        node video_server.js

Step 10: Bypass SSL error by accepting invalid certificate. Click on following link and acccept.

        https://localhost:8091/

Step 11: Run app.py (This is main driver file for web)
        
        python app.py

Step 12: Run produce_ai_service.py after each video call which is main driver file to extract tags from videos and inserts into database.

        python produce_ai_service.py 