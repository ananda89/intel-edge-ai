from sqlalchemy import create_engine
import pandas as pd

CREATE_TABLE_STATEMENT = 'CREATE TABLE invitations(' \
                         'invite_id   INT  NOT NULL,' \
                         'room_token VARCHAR (20)      NOT NULL,' \
                         'contact_info  VARCHAR (20)   NOT NULL,' \
                         'isconnected  BOOLEAN,' \
                         'PRIMARY KEY (invite_id));'


class DB:
    '''
    Load and store information for working with the Inference Engine,
    and any loaded models.
    '''

    def __init__(self):
        self.engine = create_engine('sqlite:///db/db.sqlite')

    def get_table_names(self):
        # Save the table names to a list: table_names
        table_names = self.engine.table_names()
        return table_names

    def create_table(self, query):
        # Open engine connection: con
        con = self.engine.connect()
        con.execute(query)
        con.close()

    def get_inviations(self):
        # Open engine in context manager
        # Perform query and save results to DataFrame: df
        with self.engine.connect() as con:
            rs = con.execute("SELECT * FROM invitations")
            # df = pd.DataFrame(rs.fetchmany(3))
            df = pd.DataFrame(rs.fetchall())
            df.columns = rs.keys()

        return df

    def get_data(self, query):
        # Execute query and store records in DataFrame: df
        df = pd.read_sql_query(query, self.engine)
        return df

    def execute_query(self, query):
        with self.engine.connect() as con:
            rs = con.execute(query)
            return rs

    def insert_invite(self, data):
        if not 'invite_id' in data.keys():
            resultDf = self.get_data('SELECT * FROM invitations')
            inset_query = "INSERT INTO invitations " \
                          "VALUES ('" + str(len(resultDf)) + "', '" + data['room_token'] + "', '" + data[
                              'contact_info'] + "', '0');"
            print(inset_query)
            rs = self.execute_query(inset_query)
            return rs
        else:
            resultDf = self.get_data('SELECT * FROM invitations WHERE invite_id=' + data['invite_id'])
            update_query = "UPDATE invitations SET isconnected = '1' WHERE invite_id = " + data['invite_id'] + ";"
            if (len(resultDf) > 0):
                rs = self.execute_query(update_query)
                return rs
            else:
                print('NO invite record FOUND!!')
                return None

    def get_invitations(self, id=None):
        if id == None:
            return self.get_data('SELECT * FROM invitations')
        else:
            return self.get_data('SELECT * FROM invitations WHERE invite_id=' + str(id))

# data = {
#     'room_token':'213123ccsd',
#     'contact_info':'mayur@maili.com'
# }

# create_table(engine, CREATE_TABLE_STATEMENT)
# insert_invite(engine,data)
print(DB().get_invitations())
