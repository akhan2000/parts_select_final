import React, { useState, useEffect, useRef } from "react";
import "./ChatWindow.css";
import { marked } from "marked";

function ChatWindow() {
  const defaultMessage = [{
    role: "assistant",
    content: "Hi, how can I help you today?"
  }];

  const [messages, setMessages] = useState(defaultMessage);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAIMessage = async (userInput) => {
    try {
      const response = await fetch('http://localhost:5000/api/ai-message', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ input: userInput })
      });
      const data = await response.json();
      console.log("Received data from backend:", data);  // Debugging line
      if (!response.ok) {
        throw new Error("Failed to fetch AI response");
      }
      // Adjust this part to directly use 'data' if the response is plain text or directly structured
      return { role: 'assistant', content: data.response || data };
    } catch (error) {
      console.error('Failed to fetch data:', error);
      return { role: 'assistant', content: "Error processing your request." };
    }
};


  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (trimmedInput) {
      setMessages(prevMessages => [...prevMessages, { role: "user", content: trimmedInput }]);
      setInput("");

      const newMessage = await getAIMessage(trimmedInput);
      setMessages(prevMessages => [...prevMessages, newMessage]);
    }
  };

  return (
    <div className="messages-container">
      {messages.map((message, index) => (
        <div key={index} className={`${message.role}-message-container`}>
          {message.content && (
            <div className={`message ${message.role}-message`}>
              <div dangerouslySetInnerHTML={{__html: marked(message.content).replace(/<p>|<\/p>/g, "")}}></div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSend();
              e.preventDefault();
            }
          }}
          rows="3"
        />
        <button className="send-button" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;
