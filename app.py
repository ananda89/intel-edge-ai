# import the Flask class from the flask module
from flask import Flask, render_template, request, send_from_directory, make_response
import os
import db_manager
import json
from db_manager import DB

current_dir = os.curdir
# create the application object
app = Flask(__name__)
app.config['DATABASE_PATH'] = os.path.join(os.curdir, 'db/db.sqlite')
global manager


# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db/test.db'

@app.route('/<path:path>')
def send_js(path):
    return send_from_directory('static', path)


# use decorators to link the function to a url
@app.route('/')
def home():
    # return "Hello, World!"  # return a string
    return render_template('search.html')


@app.route('/home')
def caller():
    return render_template('index.html')


@app.route('/guest/<roomToken>/<id>')
def callee(roomToken, id):
    data = {
        'invite_id': id
    }
    manager.insert_invite(data)
    return render_template('guest.html', roomToken=roomToken)


@app.route('/invite/<id>')
def invite_report(id):
    detail = {}
    return render_template('detail.html', id)


'''
API DEVELOPMENT
'''


@app.route('/invite', methods=['POST'])
def invite():
    result = manager.insert_invite(request.json)
    if (result.rowcount > 0):
        return make_response(json.dumps({'success': 1, 'invite_id': result.lastrowid - 1}), 200)
    else:
        return make_response(json.dumps({'success': 0}), 200)


@app.route('/get_invites', methods=['GET'])
def get_invite():
    try:
        id = request.args['id']
        resultDf = manager.get_invitations(id)
    except Exception as err:
        resultDf = manager.get_invitations()

    data = []
    for index, rows in resultDf.iterrows():
        print(rows)
        data.append({
            'id': rows['invite_id'],
            'room_token': rows['room_token'],
            'contact_info': rows['contact_info'],
            'isconnected': rows['isconnected']
        })

    result = {
        'data': data
    }
    if len(data) > 0:
        result['success'] = 1
    else:
        result['success'] = 0

    return make_response(json.dumps(result), 200)


# start the server with the 'run()' method
if __name__ == '__main__':
    manager = DB()

    if not os.path.exists(app.config['DATABASE_PATH']):
        manager.create_table(db_manager.CREATE_TABLE_STATEMENT)
        print("REQUIRED TABLES CREATED..")
    app.run(debug=True)
