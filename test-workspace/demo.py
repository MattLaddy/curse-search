"""
Demo Python file to test the recursive function search feature
"""

# Main function that the user would highlight
def process_data(data):
    """Process the input data"""
    print("Processing data...")
    valid_data = validate_input(data)
    
    if valid_data:
        return transform_data(valid_data)
    
    return None

# This is called by process_data
def validate_input(input_data):
    """Validate the input data"""
    print("Validating input...")
    
    # This function calls check_format
    if not input_data:
        return None
    
    if check_format(input_data):
        return input_data
    
    return None

# This is called by validate_input
def check_format(data):
    """Check the format of the data"""
    print("Checking format...")
    
    # This function calls deep_validation
    if not isinstance(data, dict):
        return False
    
    return deep_validation(data)

# This is called by check_format
def deep_validation(obj):
    """Perform deep validation on the object"""
    print("Performing deep validation...")
    
    # Final function in the chain
    if "id" not in obj:
        return False
    
    return True

# This is called by process_data
def transform_data(data):
    """Transform the validated data"""
    print("Transforming data...")
    
    # This creates a formatted result
    import time
    return {
        "id": data["id"],
        "processed": True,
        "timestamp": time.time()
    }

# Example usage
if __name__ == "__main__":
    sample_data = {
        "id": 123,
        "name": "Test"
    }
    
    result = process_data(sample_data)
    print("Result:", result)

"""
Function call hierarchy:

process_data
├── validate_input
│   └── check_format
│       └── deep_validation
└── transform_data

When searching for "deep_validation" within the highlighted process_data function,
it should be found since it's called indirectly through the chain of function calls.
""" 