const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


function fakeFetch() {
    // Promisify the request.
    return new Promise((resolve, reject) => {
        // Emulate an asynchroneous fetch.
        setTimeout(() => {
            let result = 0.4; // Change to 0.4 to trigger a failed fetch.
            if (result < 0.5) {;
                reject('__FAIL__');
            } else {
                resolve({name: 'apple', price: '1234.12', time: 1549926859970});
            }
        }, 2000);
    });
}

function sendExchangeRequest(id, pair, symbols, callback)
{
    let err, result

    delay(2000)
        .then(() =>
            fakeFetch()
            .then((output) => callback('None', output))
            .catch((error) => callback(error, null)))

}

async function sendExchangeRequest(id, pair, symbols)
{
    try {
        await delay(2000);
        return await fakeFetch();
    } catch (err) {
        throw {error: err, reason: 'Problem fetching result'};
    }
}
