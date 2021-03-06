const assert = require('assert');
const snowflake = require('./index.js');

const connection = {
  name: 'test snowflake',
  driver: 'snowflake',
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  maxRows: 50000,
};

const dropTable = 'DROP TABLE IF EXISTS test;';
const createTable = 'CREATE TABLE test (id int);';
const inserts = 'INSERT INTO test (id) VALUES (1), (2), (3);';

describe('drivers/snowflake', function () {
  before(function () {
    this.timeout(10000);
    return snowflake
      .runQuery(dropTable, connection)
      .then(() => snowflake.runQuery(createTable, connection))
      .then(() => snowflake.runQuery(inserts, connection));
  });

  it('tests connection', function () {
    return snowflake.testConnection(connection);
  });

  it('getSchema()', function () {
    this.timeout(60000);
    return snowflake.getSchema(connection).then((schemaInfo) => {
      assert(schemaInfo.SQLPAD, 'SQLPAD');
      assert(schemaInfo.SQLPAD.TEST, 'SQLPAD.TEST');
      const columns = schemaInfo.SQLPAD.TEST;
      assert.equal(columns.length, 1, 'columns.length');
      assert.equal(columns[0].table_schema, 'SQLPAD', 'TABLE_SCHEMA');
      assert.equal(columns[0].table_name, 'TEST', 'TABLE_NAME');
      assert.equal(columns[0].column_name, 'ID', 'COLUMN_NAME');
      assert(columns[0].hasOwnProperty('data_type'), 'DATA_TYPE');
    });
  });

  it('runQuery under limit', function () {
    return snowflake
      .runQuery('SELECT id FROM test WHERE id = 1;', connection)
      .then((results) => {
        assert(!results.incomplete, 'not incomplete');
        assert.equal(results.rows.length, 1, 'rows length');
      });
  });

  it('runQuery over limit', function () {
    const limitedConnection = { ...connection, maxRows: 2 };
    return snowflake
      .runQuery('SELECT * FROM test;', limitedConnection)
      .then((results) => {
        assert(results.incomplete, 'incomplete');
        assert.equal(results.rows.length, 2, 'row length');
      });
  });

  it('returns descriptive error message', function () {
    let error;
    return snowflake
      .runQuery('SELECT * FROM missing_table;', connection)
      .catch((e) => {
        error = e;
      })
      .then(() => {
        assert(error);
        assert(error.toString().indexOf('MISSING_TABLE') > -1);
      });
  });
});
