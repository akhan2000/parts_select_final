from flask import Flask, request, jsonify
from flask_cors import CORS
from query_handling import simulate_user_interaction

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

@app.route('/api/ai-message', methods=['POST'])
def get_ai_message():
    try:
        user_query = request.get_json()['input']
        print(f"Received user query: {user_query}")  # Print to see the query received
        response = simulate_user_interaction(user_query)
        print(f"Sending response: {response}")  # Print to check what is being sent back
        return jsonify({"response": response})  # Ensure this key "response" matches what the frontend expects
    except Exception as e:
        print(f"Error: {str(e)}")  # This will print any error to the Flask console.
        return jsonify({"response": "Error processing your request."}), 400

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
