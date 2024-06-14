# Part Select RAG Bot - AI Assistant Chrome Extension

## Overview

The RAG Bot is an AI-powered Chrome Extension that assists users with inquiries about appliance parts from partselect through a dynamic, interactive chat interface. The project integrates web scraping, data processing, vector search databases, and an AI-driven query handling system to deliver accurate and context-aware responses.

## Project Structure

### Key Components and Their Roles

#### Web Scraper (`Puppeteer.js`)
- **Path**: `part_select/Puppeteer.js`
- **Functionality**: Automates the web browsing to scrape appliance parts data from online catalogs.
- **Technologies Used**: Puppeteer for controlling headless Chrome to scrape web data.
- **Execution**: Run periodically or manually to update the dataset.

#### Data Processing Script (`data_processing.py`)
- **Path**: `parts-select/src/components/Models/data_processing.py`
- **Functionality**: Transforms raw scraped data into structured JSON, generates embeddings using OpenAI's models, and uploads these embeddings to Pinecone for vector-based searching.
- **Technologies Used**: Python, OpenAI, Pinecone.
- **Execution**: Run after scraping to process new data and update the vector database.

#### Query Handling Module (`query_handling.py`)
- **Path**: `parts-select/src/components/Models/query_handling.py`
- **Functionality**: Handles user queries from the Chrome Extension, processes them to extract meaningful information, performs searches against the Pinecone database, and formats responses.
- **Technologies Used**: Python, Pinecone, Regex for direct part number extraction.
- **Execution**: Integrated within the server; processes queries in real-time as they are received from the frontend.

#### Server (`server.py`)
- **Path**: `parts-select/src/components/Models/server.py`
- **Functionality**: Acts as the backend server for the Chrome Extension, handling HTTP requests, interfacing with the query handling module, and sending responses back to the frontend.
- **Technologies Used**: Flask, Flask-CORS.
- **Execution**: Must be running whenever the Chrome Extension is in use to handle API requests.

#### Frontend UI (`ChatWindow.js`)
- **Functionality**: Provides the interactive user interface in the Chrome Extension where users can send queries and view responses.
- **Technologies Used**: React.js, CSS for styling.
- **Execution**: Loaded in the user’s Chrome browser as part of the extension.

## Setup and Execution Instructions

### Prerequisites
- Node.js (v14 or later)
- Python (v3.8 or later)
- Yarn or npm for managing JavaScript dependencies
- Access to OpenAI and Pinecone services, with API keys

### Installation Steps

1. **Clone the project repository:**
   ```bash
   git clone https://github.com/your-username/parts_select_final
 

2. **Setup the Backend**    
cd /path/to/server/directory
pip install -r requirements.txt
# Configure .env file with necessary API keys

3. **Prepare and Run the Data Processing Scripts**
python parts-select/src/components/Models/data_processing.py

4. **Run the Server**
python parts-select/src/components/Models/server.py

5. **Setup and Launch the Frontend**
cd /path/to/frontend/directory
yarn install
yarn build
# Load the build folder as an unpacked extension in Chrome

6. **Running the Scraper**
node part_select/Puppeteer.js
