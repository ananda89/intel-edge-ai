from sqlalchemy import create_engine
import pandas as pd

CREATE_TABLE_STATEMENT = 'CREATE TABLE invitations(' \
                         'invite_id   INT  NOT NULL,' \
                         'room_token VARCHAR (20)      NOT NULL,' \
                         'contact_info  VARCHAR (20)   NOT NULL,' \
                         'isconnected  BOOLEAN,' \
                         'PRIMARY KEY (invite_id));'

CREATE_VIDEOS_TABLE_STATEMENT = 'CREATE TABLE videos(' \
                                'id   INT  NOT NULL,' \
                                'invite_id   INT  NOT NULL,' \
                                'path VARCHAR (60),' \
                                'status INT NOT NULL,' \
                                'tags  VARCHAR (200),' \
                                'PRIMARY KEY (id));'


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

    # 0-> pending and 1 for completed and 2 for ai generated
    def insert_video(self, data):
        resultDf = self.get_data('SELECT * FROM videos')
        inset_query = "INSERT INTO videos (id, invite_id, status) " \
                      "VALUES ('" + str(len(resultDf)) + "', '" + str(data['invite_id']) + "', 0);"
        print(inset_query)
        rs = self.execute_query(inset_query)
        return rs

    def update_video(self, data):
        update_query = "UPDATE videos SET " \
                       "status = '"+str(data['status'])+"'," \
                       "path = '"+data['path']+"'," \
                       "tags = '"+data['tags']+"'" \
                       " WHERE id = " + str(data['id']) + ";"
        self.execute_query(update_query)

    def get_videos(self, invite_id=None):
        if invite_id == None:
            return self.get_data('SELECT * FROM videos')
        else:
            return self.get_data('SELECT * FROM videos WHERE invite_id=' + str(invite_id))

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


# DB().create_table(CREATE_TABLE_STATEMENT)
# DB().create_table(CREATE_VIDEOS_TABLE_STATEMENT)
# insert_invite(engine,data)
# print(DB().get_invitations())
