# import the Flask class from the flask module
from flask import Flask, render_template, request, send_from_directory
import os

current_dir = os.curdir
# create the application object
app = Flask(__name__)


@app.route('/<path:path>')
def send_js(path):
    return send_from_directory('static', path)


# use decorators to link the function to a url
@app.route('/')
def home():
    return "Hello, World!"  # return a string


@app.route('/home')
def caller():
    return render_template('index.html')  # render a template


@app.route('/guest/<int:roomToken>')
def callee(roomToken):
    return render_template('guest.html', roomToken=roomToken)


# start the server with the 'run()' method
if __name__ == '__main__':
    app.run(debug=True)
