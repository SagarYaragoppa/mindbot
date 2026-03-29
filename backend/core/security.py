from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize standard global IP rate limiter mapping
limiter = Limiter(key_func=get_remote_address)
