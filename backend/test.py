import hashlib 

def generate_activation_key(macId: str, motherboardSerial: str) -> str:
    input_string = f"{macId}:{motherboardSerial}".upper()

    hash_object = hashlib.sha256()
    hash_object.update(input_string.encode('utf-8'))
    hex_hash = hash_object.hexdigest().upper()

    big_int_value = int(hex_hash, 16)

    base36_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    base36_result = ""
    while big_int_value > 0:
        big_int_value, remainder = divmod(big_int_value, 36)
        base36_result = base36_chars[remainder] + base36_result
    
    if not base36_result:
        base36_result = "0"
        
    base36 = base36_result.upper()

    raw_key = base36.zfill(16)[:16]

    formatted_key = "-".join([raw_key[i:i+4] for i in range(0, len(raw_key), 4)])

    return formatted_key

if __name__ == "__main__":
    macId = "BFEBFBFF000906A4"
    motherboardSerial = "PPVCK048JH58C7"
    
    activation_key = generate_activation_key(macId, motherboardSerial)
    print(f"Generated Activation Key: {activation_key}")