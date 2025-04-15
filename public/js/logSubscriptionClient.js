// public/js/logSubscriptionClient.js

function getParams() {
	const params = new URLSearchParams(window.location.search);
	const obj = {};
	for (const [key, value] of params) {
		obj[key] = decodeURIComponent(value);
	}
	return obj;
}

async function logToAirtable() {
	const data = getParams();

	try {
		const res = await fetch('/.netlify/functions/logSubscription', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		const result = await res.json();
		console.log('Logged to Airtable:', result);
	} catch (err) {
		console.error('Failed to log subscription', err);
	}
}

logToAirtable();
