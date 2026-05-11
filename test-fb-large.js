import fetch from 'node-fetch';

async function test() {
  const largeString = 'a'.repeat(2 * 1024 * 1024); // 2MB string
  const response = await fetch('http://localhost:3000/api/facebook/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'Test', imageUrl: largeString })
  });

  console.log('Status:', response.status);
  try {
    const text = await response.text();
    console.log('Body:', text);
  } catch (e) {
    console.error('Error reading body:', e);
  }
}
test();
