import openai
import pinecone
import json
import os
from dotenv import load_dotenv
load_dotenv()



openai_api_key = os.getenv('OPENAI_API_KEY')
pinecone_api_key = os.getenv('PINECONE_API_KEY')

# Initialize OpenAI


# Verify the initialization of the client object for OpenAI
print("Initializing OpenAI client...")
client = openai.OpenAI(api_key=openai.api_key)
print("OpenAI client initialized successfully.")

# Initialize Pinecone
pc = pinecone.Pinecone(api_key=pinecone_api_key)

# Create or connect to a Pinecone index
index_name = 'embeddings-index'
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=3072,  # Adjust according to the output dimension of your embedding model
        metric='cosine',
        spec=pinecone.ServerlessSpec(cloud='aws', region='us-east-1')  # Specify the cloud and region
    )
index = pc.Index(index_name)

# Function to load JSON data
def load_json_data(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

# Function to generate embeddings using OpenAI
def generate_embeddings(item):
    part_number = item.get('partNumber', '')
    description = item.get('description', '')
    text = part_number
    if part_number and description:
        text += " " + description
    text = text.replace("\n", " ")  # Normalize the text
    embeddings = []
    try:
        response = client.embeddings.create(
            input=[text],
            model="text-embedding-3-large"
        )
        embedding = response.data[0].embedding
        embeddings.append(embedding)
    except Exception as e:
        print(f"Failed to generate embeddings for text: {text}. Error: {e}")
    return embeddings


# Function to upsert data into Pinecone
def upsert_to_pinecone(data, batch_size=100):
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        items_to_upsert = []
        for item in batch:
            item_id = item['partNumber']  # Use 'partNumber' as the id
            item_vector = generate_embeddings(item)[0]  # Pass the item dictionary directly
            # Convert 'questionAnswerPairs' and 'repairStories' to a list of strings
            if 'questionAnswerPairs' in item:
                item['questionAnswerPairs'] = [json.dumps(pair) for pair in item['questionAnswerPairs']]
            if 'repairStories' in item:
                item['repairStories'] = [json.dumps(story) for story in item['repairStories']]
            # Check if 'videoUrl' is null and set it to an empty string if it is
            if 'videoUrl' in item and item['videoUrl'] is None:
                item['videoUrl'] = ''
            metadata = item  # Include the whole item as the metadata
            items_to_upsert.append((item_id, item_vector, metadata))
            print(f"Upserting item: ID={item_id}, Vector Length={len(item_vector)}, Metadata={metadata}")
        
        index.upsert(vectors=items_to_upsert)
        print("Upsert completed.")

def process_and_store_embeddings(json_file):
    data = load_json_data(json_file)
    upsert_to_pinecone(data)
    print(f"Data successfully embedded and upserted to Pinecone for {len(data)} items.")


process_and_store_embeddings('/Users/asfandyarkhan/Projects/rag_bot/src/scraper/refrigeratorparts.json')



# Function to get LLM response with context from relevant items
# def get_llm_response(query, relevant_items):
#     # Concatenate relevant item details with the user's query to provide context to LLM
#     context = query + " " + " ".join(relevant_items)  # Adding space between query and items
#     try:
#         response = client.chat.completions.create(
#             model="gpt-4",  # Use 'model' instead of 'engine'
#             messages=[
#                 {"role": "user", "content": context}  # Pass the user query as a message
#             ],
#             max_tokens=50
#         )
#         if 'choices' in response and response['choices']:
#             return response['choices'][0]['message']['content'].strip()
#         else:
#             print("No valid response choices found.")
#             return None
#     except Exception as e:
#         print(f"Failed to generate response for query: {query}. Error: {e}")
#         return None

