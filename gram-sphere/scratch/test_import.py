try:
    from google.cloud.sql.connector import Connector
    print("Import successful!")
except ImportError as e:
    print(f"Import failed: {e}")
    import sys
    print(f"Python path: {sys.path}")
    import google
    print(f"Google package path: {google.__path__}")
