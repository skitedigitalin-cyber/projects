const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testToday() {
  const token = jwt.sign(
    {
      userId: '6af2eeefdefe439c58195098',
      role: 'SEO Analyst',
      tenantId: '6af2c94a9d29730751ed2d01'
    },
    'skite_secret_key',
    { expiresIn: '1d' }
  );

  const res = await axios.get('https://whitesmoke-goshawk-594665.hostingersite.com/api/hr/attendance/today', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Rinsha today status on live API:', res.data);
}

testToday().catch(console.error);
