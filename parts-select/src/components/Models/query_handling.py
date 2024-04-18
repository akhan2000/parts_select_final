import openai
import pinecone
import json
import re
from profanity import profanity
from dotenv import load_dotenv
import os
load_dotenv()



# Initialize OpenAI
openai_api_key = os.getenv('OPENAI_API_KEY')
pinecone_api_key = os.getenv('PINECONE_API_KEY')

# Verify the initialization of the client object for OpenAI
print("Initializing OpenAI client...")
client = openai.OpenAI(api_key=openai.api_key)
print("OpenAI client initialized successfully.")

conversation_history = []

# Initialize Pinecone
pc = pinecone.Pinecone(api_key=pinecone_api_key)
index_name = 'embeddings-index'
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=3072,  # Adjust according to the output dimension of your embedding model
        metric='cosine',
        spec=pinecone.ServerlessSpec(cloud='aws', region='us-east-1')  # Specify the cloud and region
    )
index = pc.Index(index_name)


conversation_history = []

def extract_part_number_from_query(query):
    match = re.search(r'PS\d+', query)
    return match.group(0) if match else None

def search_items(query, top_k=50):
    query_embedding = generate_query_embedding(query)
    if not query_embedding:
        return None
    try:
        # Extract part number from the query
        query_part_number = extract_part_number_from_query(query)
        
        # Prepare the query parameters
        query_params = {
            "vector": query_embedding, 
            "top_k": top_k, 
            "include_metadata": True
        }
        
        # If a part number is found, add a metadata filter to the query parameters
        if query_part_number:
            query_params["filter"] = {"partNumber": {"$eq": query_part_number}}
        
        response = index.query(**query_params)
        
        if 'matches' in response and response['matches']:
            return response['matches'][0].get('metadata', {})
    except Exception as e:
        print(f"Failed to query by embedding: {query}. Error: {e}")
    return None





MAX_HISTORY_LENGTH = 3 
def get_llm_response(query, relevant_item):
    # Create context from the query and the relevant item
    context_parts = [f"{key}: {value}" for key, value in relevant_item.items()]
    context = query + " " + " ".join(context_parts)
    print(f"Context provided to the LLM: {context}")
    conversation_history.append({"role": "system", "content": context})

    prompt = (
    "You are a chatbot assistant with access to detailed information about various fridge and dishwasher parts. "
    "Assume customer support context and provide responses based on the user's queries."
    "Be human aligned and provide helpful responses to the user's queries."
    "Your role is to provide accurate and helpful responses to the user's queries based on the information available in the context. "
    "The context includes details about specific parts, their descriptions, model numbers, manufacturers, and other relevant information. "
    "You should carefully read and understand this information to provide the best possible response. "
    "If the user's query mentions a part number, model number, or manufacturer that is present in the context, "
    "you should use this information to provide a detailed and helpful response. "
    "Do not provide generic responses or information that is not relevant to the user's query."
    "If the context includes troubleshooting information or details about replacement parts, you should use this information to assist the user. "
    "If the user's query mentions a product that is cross-referenced in the context, you should recognize this and provide relevant information. "
    "You should always stay within the context and not provide information that is not included in the context. "
    "Complete the response within 150 tokens"
    "If you do not have the specific part number, model number, or brand name in the context, "
    "you should politely inform the user that you cannot provide information for that part. "
    "You should not answer questions that are unrelated to fridge and dishwasher parts. "
    "Please answer queries that do not have specific part numbers or models based on context provided"
    "make sure to use some reasoning as well for example if user says something like hello or gives input unrelated to a part, you can respond with a generic response like 'How can I help you today?'"
    "Make sure to not provide part details if the user query is not related to parts" 
    f"Here is the context: \"{context}\" "
    f"Here is the user's query: \"{query}\""
)

    # Limit the conversation history to the last MAX_HISTORY_LENGTH messages
    if len(conversation_history) > MAX_HISTORY_LENGTH:
        conversation_history.pop(0)

    try:
        print(f"Conversation history passed to the LLM: {conversation_history}")
        # Request a completion from OpenAI's Chat API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=conversation_history,
            max_tokens=500
        )

        # Check if the response has choices and a message content
        if response.choices and response.choices[0].message:
            content = response.choices[0].message.content.strip()
            if content:
                content = re.sub(r'\s[^.!?]*$', '', content)
                # Add the assistant's response to the conversation history
                conversation_history.append({"role": "assistant", "content": content})

                # Limit the conversation history to the last MAX_HISTORY_LENGTH messages
                if len(conversation_history) > MAX_HISTORY_LENGTH:
                    conversation_history.pop(0)

                return content
            else:
                print("Response contains no content.")
        else:
            print("No valid response choices found.")

    except Exception as e:
        print(f"Failed to generate response for query: {query}. Error: {e}")

    return None
    

def generate_query_embedding(query):
    query = query.replace("\n", " ")  # Normalize the query
    try:
        response = client.embeddings.create(
            input=[query] if isinstance(query, str) else query,
            model="text-embedding-3-large"
        )
        # Print the response for debugging
        # Assuming response.data is accessible as a property and it's a list of objects
        embedding = response.data[0].embedding
     # Print the embedding for debugging
    except Exception as e:
        print(f"Failed to generate embeddings for query: {query}. Error: {e}")
        return None
    return embedding

# added profanity checker to the code to prevent spam messages 



def is_profane(text):
    return profanity.contains_profanity(text)

def simulate_user_interaction(user_query):
    print(f"Received query: {user_query}")

    if is_profane(user_query):
        print("Profane query detected. Not querying the LLM.")
        return "I'm sorry, but I can't assist with that."
    else:

        relevant_items = search_items(user_query)
        conversation_history.append({"role": "user", "content": user_query})
 
        llm_response = get_llm_response(user_query, relevant_items)
        print(f"LLM response: {llm_response}")
        return llm_response



    

if __name__ == "__main__":
    
    simulate_user_interaction()
