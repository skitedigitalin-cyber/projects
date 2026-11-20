const axios = require('axios');

async function testLiveApi() {
  try {
    const loginRes = await axios.post('https://whitesmoke-goshawk-594665.hostingersite.com/api/auth/login', {
      email: 'admin@skite.com',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('Login successful on live hostinger API! Token received.');

    // Fetch attendance from live API
    const attRes = await axios.get('https://whitesmoke-goshawk-594665.hostingersite.com/api/hr/attendance', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Total live attendance records returned:', attRes.data.length);
    console.log('Top 10 live attendance records:');
    attRes.data.slice(0, 10).forEach((item, idx) => {
      const emp = item.employee;
      const att = item.attendance;
      console.log(`${idx + 1}. ${emp ? emp.firstName + ' ' + emp.lastName : 'Unknown'} | Date: ${att?.date?.slice(0, 10)} | in: ${att?.checkInTime} | out: ${att?.checkOutTime} | status: ${att?.status}`);
    });

    // Check Rinsha specifically in live API
    const rinshaRecords = attRes.data.filter(item => 
      item.employee?.firstName?.includes('Rinsha') || 
      item.employee?.lastName?.includes('Rinsha')
    );
    console.log('\nRinsha records in live API:', rinshaRecords.length);
    rinshaRecords.slice(0, 5).forEach(r => {
      console.log(`Rinsha: Date: ${r.attendance?.date} | in: ${r.attendance?.checkInTime} | out: ${r.attendance?.checkOutTime} | status: ${r.attendance?.status}`);
    });

  } catch (err) {
    console.error('Error querying live API:', err.response?.data || err.message);
  }
}

testLiveApi();
