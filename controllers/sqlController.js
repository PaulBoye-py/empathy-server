var dbConnection = require('../utils/connectDb');

// dbConnection

const sqlController = {
    getTherapists: async (req, res) => {
      try {
        const query = 'Select * from professionals';
        
        await dbConnection.query(query, (err, result) => {
          if (!result || !Array.isArray(result) || result.length === 0) {
            console.log('No data found'); // Log if no data is retrieved
          } else {
            console.log(result); // Log the retrieved rows if available
          }
          
          res.json(result);
        })

       
      } catch (error) {
        console.error('Error fetching data:', error); // Log any errors
        res.status(500).json({ error: 'Internal Server Error' });
      }
      // const { 
        //     location, 
        //     profession,
        //     gender,
        //     ageRange, 
        //     religion, 
        //     maritalStatus, 
        //     meetingType,
        // } = req.query; // Use req.query instead of req.body for GET requests

        // var sql = 'Select * from professionals';
        // res.query(sql, (err, result) => {
        //     console.log(result);
        // })

        //   try {
        //         const { rows } = await dbConnection.query(query, [location, profession, gender, ageRange, religion, maritalStatus]);
        //         res.json(rows);
        //       } catch (error) {
        //         res.status(500).json({ error: 'Internal Server Error' });
        //       }
        //   // Define the currency map as before
        //     const physicalCurrencyMap = {
        //         Nigeria: 'physical_naira',
        //         UnitedStates: 'physical_dollar',
        //         UnitedKingdom: 'physical_pounds',
        //     };
    
        //     const virtualCurrencyMap = {
        //         Nigeria: 'virtual_naira',
        //         UnitedStates: 'virtual_dollar',
        //         UnitedKingdom: 'virtual_pounds',
        //     }
    
           
    
        //     let currencyField = 'physical_naira'; // Default to Naira for physical meeting
    
        //     // this block of code below sets up a currencyMap based on the meeting type (physical or virtual) and then checks whether 
        //     // to use this map to select the currencyField for fetching therapist charges based on the patient's location and meeting preference.
    
        //     const currencyMap = meetingType === 'virtual' ? virtualCurrencyMap : physicalCurrencyMap;
          
        //     if (meetingType === 'virtual' || currencyMap[location]) {
        //       currencyField = currencyMap[location];
        //     }
    
        //     let query;
    
        //     if (meetingType === 'physical') {
        //         query = `
        //           SELECT prof_name, location, profession, gender, age_range, religion, marital_status, physical, virtual_naira, virtual_dollar, virtual_pounds, ${currencyField} AS therapist_charge
        //           FROM professionals
        //           WHERE location = ? AND profession = ? AND gender = ? AND age_range = ? AND religion = ? AND marital_status = ? AND physical = true;
        //         `;
        //       } else {
        //         query = `
        //           SELECT prof_name, location, profession, gender, age_range, religion, marital_status, physical, virtual_naira, virtual_dollar, virtual_pounds, ${currencyField} AS therapist_charge
        //           FROM professionals
        //           WHERE location = ? AND profession = ? AND gender = ? AND age_range = ? AND religion = ? AND marital_status = ?;
        //         `;
        //       }
    
        //       try {
        //         const { rows } = await dbConnection.query(query, [location, profession, gender, ageRange, religion, maritalStatus]);
        //         res.json(rows);
        //       } catch (error) {
        //         res.status(500).json({ error: 'Internal Server Error' });
        //       }
    
    
        // try {
        //     const query = `SELECT * FROM professionals WHERE location = ? AND profession = ? AND gender = ? AND age_range = ? AND religion = ? AND marital_status = ? AND  = ? AND physical = ?`;
            
        //     // Execute the query using the connection pool
        //     const [results, fields] = await dbConnection.execute(query, [location, profession, gender, age_range, religion, marital_status, physical]);
    
        //     // Send the results back to the client
        //     res.json(results);
        // } catch (error) {
        //     console.error('Error retrieving data:', error);
        //     res.status(500).json({ error: 'Internal Server Error' });
        // }
    }
};

module.exports = sqlController