// Direct test of JSON formatting
const testObj = { a: 1, b: 2, c: { d: 3 } };
const str = JSON.stringify(testObj);
console.log('JSON output:', str);

// Test display in console
console.log('\nCharacter codes:');
for (let i = 0; i < str.length; i++) {
    console.log(`Position ${i}: '${str[i]}' (${str.charCodeAt(i)})`);
}

// Test direct string comparison
const expected = '{"a":1,"b":2,"c":{"d":3}}';
console.log('\nExpected:', expected);
console.log('Got     :', str);
console.log('Equal?  :', str === expected);

// Manual formatting test
const manual = '{' +
    '"a":1,' +
    '"b":2,' +
    '"c":{' +
        '"d":3' +
    '}' +
'}';

console.log('\nManual format:', manual);
console.log('Parse test:', JSON.parse(manual));
