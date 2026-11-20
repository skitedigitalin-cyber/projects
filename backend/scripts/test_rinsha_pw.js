const axios = require('axios');

async function testPasswords() {
  const passwords = ['Skite@123', 'admin123', 'employee123', 'rinsha123', '123456', 'skite123'];
  for (const pw of passwords) {
    try {
      const res = await axios.post('https://whitesmoke-goshawk-594665.hostingersite.com/api/auth/login', {
        email: 'rinshaskite@gmail.com',
        password: pw
      });
      console.log(`Password MATCH for Rinsha: "${pw}"! Token:`, res.data.token?.slice(0, 20));
      return { token: res.data.token, user: res.data.user };
    } catch (e) {
      // ignore
    }
  }
  console.log('None of the default passwords matched.');
}

testPasswords();
