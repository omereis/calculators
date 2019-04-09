import flask

# Create the application.
APP = flask.Flask(__name__)

@APP.route('/')
def index():
    """ Displays the index page accessible at '/'
    """
    return flask.render_template('index.html')

@APP.route('/calculator')
def calculator():
    #return flask.render_template('Reflectivity/refl_calc.html')
    return flask.render_template('Reflectivity/calculators/calcR_d3_dark.html')
    #return flask.render_template('calcR_d3_dark.html')
@APP.route('/calculator/reflectivity_calculator')
def clacR():
    return flask.render_template('Reflectivity/calculators/calcR_d3_dark.html')
    

if __name__ == '__main__':
    from sys import argv

    if len(argv) == 2:
        print ("argv[1]: {}".format(argv[1]))
        port = int(argv[1])
    else:
        port = 5000
    APP.debug=True
    APP.run(port=port host='0.0.0.0')
