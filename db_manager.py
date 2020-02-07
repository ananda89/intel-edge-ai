from sqlalchemy import create_engine
import pandas as pd

engine = create_engine('sqlite:///db/call.sqlite')

CREATE_TABLE_STATEMENT = 'CREATE TABLE invitations(' \
                         'invite_id   INT              NOT NULL,' \
                         'room_token VARCHAR (20)      NOT NULL,' \
                         'contact_info  VARCHAR (20)   NOT NULL,' \
                         'PRIMARY KEY (invite_id));'

def get_table_names(engine):
    # Save the table names to a list: table_names
    table_names = engine.table_names()
    return table_names

def create_database(engine):
    # Open engine connection: con
    con = engine.connect()
    con.execute(CREATE_TABLE_STATEMENT)
    con.close()

def get_inviations(engine):
    # Open engine in context manager
    # Perform query and save results to DataFrame: df
    with engine.connect() as con:
        rs = con.execute("SELECT * FROM invitations")
        # df = pd.DataFrame(rs.fetchmany(3))
        df = pd.DataFrame(rs.fetchall())
        df.columns = rs.keys()

    return df

def get_data(engine):
    # Execute query and store records in DataFrame: df
    df = pd.read_sql_query('SELECT * FROM invitations', engine)

    # Print head of DataFrame
    print(df.head())

get_data(engine)