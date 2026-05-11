import fetch from 'node-fetch';

fetch('http://localhost:3000/api/facebook/post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'test' })
}).then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}).catch(err => console.error(err));
