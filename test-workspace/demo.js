/**
 * Demo file to test the recursive function search feature
 */

// Main function that the user would highlight
function processData(data) {
  // This function calls validateInput
  console.log('Processing data...');
  const validData = validateInput(data);
  
  if (validData) {
    return transformData(validData);
  }
  
  return null;
}

// This is called by processData
function validateInput(input) {
  console.log('Validating input...');
  
  // This function calls checkFormat
  if (!input) {
    return null;
  }
  
  if (checkFormat(input)) {
    return input;
  }
  
  return null;
}

// This is called by validateInput
function checkFormat(data) {
  console.log('Checking format...');
  
  // This function calls deepValidation
  if (typeof data !== 'object') {
    return false;
  }
  
  return deepValidation(data);
}

// This is called by checkFormat
function deepValidation(obj) {
  console.log('Performing deep validation...');
  
  // Final function in the chain
  if (!obj.hasOwnProperty('id')) {
    return false;
  }
  
  return true;
}

// This is called by processData
function transformData(data) {
  console.log('Transforming data...');
  
  // This creates a formatted result
  return {
    id: data.id,
    processed: true,
    timestamp: Date.now()
  };
}

// Example usage
const sampleData = {
  id: 123,
  name: 'Test'
};

const result = processData(sampleData);
console.log('Result:', result);

/**
 * Function call hierarchy:
 * 
 * processData
 * ├── validateInput
 * │   └── checkFormat
 * │       └── deepValidation
 * └── transformData
 * 
 * When searching for "deepValidation" within the highlighted processData function,
 * it should be found since it's called indirectly through the chain of function calls.
 */ 