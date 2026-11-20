const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testRinshaCheckIn() {
  const token = jwt.sign(
    {
      userId: '6af2eeefdefe439c58195098',
      role: 'SEO Analyst',
      tenantId: '6af2c94a9d29730751ed2d01'
    },
    'skite_secret_key',
    { expiresIn: '1d' }
  );

  console.log('Generated token for Rinsha.');

  try {
    console.log('Calling today-status on live API:');
    const statusRes = await axios.get('https://whitesmoke-goshawk-594665.hostingersite.com/api/hr/attendance/today-status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Today status response:', statusRes.data);
  } catch (e) {
    console.error('today-status error:', e.response?.data || e.message);
  }

  try {
    console.log('\nCalling check-in on live API:');
    const checkinRes = await axios.post('https://whitesmoke-goshawk-594665.hostingersite.com/api/hr/attendance/check-in', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Check-in response:', checkinRes.data);
  } catch (e) {
    console.error('check-in error:', e.response?.status, e.response?.data || e.message);
  }
}

testRinshaCheckIn();
