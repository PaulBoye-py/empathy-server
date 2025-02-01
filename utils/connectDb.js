require('dotenv').config();
var mysql = require('mysql')

var dbConnection = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DATABASE_IDENTIFIER
})

// Function to connect to RDS DB Instance
dbConnection.connect((err) => {
    if (err) {
        console.log(err.message)
        return
    } 
    console.log('Connection to DB sucessful');
})

// SEE ALL RECORDS ON THE professionals table
var sql = 'Select * from professionals';
dbConnection.query(sql, (err, result) => {
    // console.log(result);
})
module.exports = dbConnection