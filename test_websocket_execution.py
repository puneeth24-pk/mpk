import unittest
from fastapi.testclient import TestClient
from backend import app
import json
import sys

# Suppress event loop warnings likely to occur in this context
import warnings
warnings.filterwarnings("ignore")

class TestWebSocketExecution(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_websocket_execution(self):
        try:
            with self.client.websocket_connect("/ws") as websocket:
                # Test 1: Basic Execution
                print("Testing Basic Execution...")
                websocket.send_json({
                    "type": "execute",
                    "code": "print('Hello World')",
                    "cellId": "cell-1"
                })
                
                path1 = False
                path2 = False
                
                while True:
                    data = websocket.receive_json()
                    if data['type'] == 'stream' and 'Hello World' in data.get('text', ''):
                        path1 = True
                        print("  Received stream output")
                    if data['type'] == 'complete' and data['cellId'] == 'cell-1':
                        path2 = True
                        print("  Received complete signal")
                        break
                
                self.assertTrue(path1, "Did not receive 'Hello World' output")
                self.assertTrue(path2, "Did not receive complete signal")
                
                # Test 2: Calculation and Variable Persistence
                print("Testing Calculation & Persistence...")
                websocket.send_json({
                    "type": "execute",
                    "code": "x = 10\nx * 2",
                    "cellId": "cell-2"
                })
                
                result_found = False
                while True:
                    data = websocket.receive_json()
                    if data['type'] == 'execute_result' or data['type'] == 'display_data':
                        if '20' in str(data.get('text', '')):
                            result_found = True
                            print("  Received calculation result: 20")
                    if data['type'] == 'complete' and data['cellId'] == 'cell-2':
                        break
                        
                self.assertTrue(result_found, "Did not receive calculation result '20'")

                # Test 3: Stderr
                print("Testing Stderr...")
                websocket.send_json({
                    "type": "execute",
                    "code": "import sys; print('error message', file=sys.stderr)",
                    "cellId": "cell-3"
                })
                
                stderr_found = False
                while True:
                    data = websocket.receive_json()
                    if data['type'] == 'stream' and data.get('name') == 'stderr' and 'error message' in data.get('text', ''):
                        stderr_found = True
                        print("  Received stderr output")
                    if data['type'] == 'complete' and data['cellId'] == 'cell-3':
                        break
                
                self.assertTrue(stderr_found, "Did not receive stderr output")
                print("All tests passed successfully!")
                
        except Exception as e:
            print(f"Test failed with error: {e}")
            raise e

if __name__ == "__main__":
    unittest.main()
