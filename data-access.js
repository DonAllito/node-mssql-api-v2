const mssql = require('mssql')

const poolConfig = () => ({
    driver: process.env.SQL_DRIVER,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_UID,
    password: process.env.SQL_PWD,
    options: {
        encrypt: false,
        enableArithAbort: false
    }
});

const fetchParams = entity => {
    const params = [];
    for (const key in entity) {
        if (entity.hasOwnProperty(key)) {
            const value = entity[key];
            params.push({
                name: key,
                value
            });
        }
    }
    return params;
};

const assignParams = (request, inputs, outputs) => {
    [inputs, outputs].forEach((operations, index) => {
        operations.forEach(operation => {
            if (operation.type) {
                index === 0 ?
                    request.input(operation.name, operation.type, operation.value) :
                    request.output(operation.name, operation.type, operation.value);
            } else {
                index === 0 ?
                    request.input(operation.name, operation.value) :
                    request.output(operation.name, operation.value);
            }
        });
    });
}

class DataAccess {

    static pool;
    static mssql = mssql;

    static async connect() {
        if (!DataAccess.pool) {
            DataAccess.pool = new mssql.ConnectionPool(poolConfig());
        }
        if (!DataAccess.pool.connected) {
            await DataAccess.pool.connect();
        }
    }

    static async query(command, inputs = [], outputs = []) {
        await DataAccess.connect();
        const request = DataAccess.pool.request();
        assignParams(request, inputs, outputs);
        return request.query(command);
    }

    static async queryEntity(command, entity, outputs = []) {
        const inputs = fetchParams(entity);
        return DataAccess.query(command, inputs, outputs);
    }

    static async execute(procedure, inputs = [], outputs = []) {
        await DataAccess.connect();
        const request = DataAccess.pool.request();
        assignParams(request, inputs, outputs);
        return request.execute(procedure);
    }

    static async executeEntity(command, entity, outputs = []) {
        const inputs = fetchParams(entity);
        return DataAccess.execute(command, inputs, outputs);
    }

    static generateTable(columns, entities) {
        const table = new mssql.Table();

        columns.forEach(column => {
            if (column && typeof column === 'object' && column.name && column.type) {
                if (column.hasOwnProperty('options')) {
                    table.columns.add(column.name, column.type, column.options);
                } else {
                    table.columns.add(column.name, column.type);
                }
            }
        });

        entities.forEach(entity => {
            table.rows.add(...columns.map(i => entity[i.name]));
        });

        return table;
    }
}

module.exports = DataAccess;