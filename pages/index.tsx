// File: pages/index.tsx

import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

interface Message {
  role: 'user' | 'ai';
  text?: string;
  image?: string;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadChatHistories();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      saveCurrentChat();
    }
  }, [messages, currentChatId, chatHistories]); // Menambahkan chatHistories sebagai dependensi

  const loadChatHistories = () => {
    const savedHistories = localStorage.getItem('allChatHistories');
    if (savedHistories) {
      const parsedHistories: ChatHistoryItem[] = JSON.parse(savedHistories);
      setChatHistories(parsedHistories);
      if (parsedHistories.length > 0) {
        const lastChat = parsedHistories[parsedHistories.length - 1];
        setMessages(lastChat.messages);
        setCurrentChatId(lastChat.id);
      }
    }
  };

  const saveCurrentChat = () => {
    const chatTitle = messages[0]?.text?.substring(0, 30) || 'Obrolan Baru';
    const updatedHistories = chatHistories.map(chat =>
      chat.id === currentChatId ? { id: currentChatId, title: chatTitle, messages } : chat
    );
    setChatHistories(updatedHistories);
    localStorage.setItem('allChatHistories', JSON.stringify(updatedHistories));
  };

  const startNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat: ChatHistoryItem = { id: newChatId, title: 'Obrolan Baru', messages: [] };
    const updatedHistories = [...chatHistories, newChat];
    setChatHistories(updatedHistories);
    setMessages([]);
    setCurrentChatId(newChatId);
    localStorage.setItem('allChatHistories', JSON.stringify(updatedHistories));
    setIsSidebarOpen(false);
  };

  const loadChat = (chatId: string) => {
    const chatToLoad = chatHistories.find(chat => chat.id === chatId);
    if (chatToLoad) {
      setMessages(chatToLoad.messages);
      setCurrentChatId(chatId);
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = (chatId: string) => {
    const isDeletingCurrentChat = chatId === currentChatId;
    const updatedHistories = chatHistories.filter(chat => chat.id !== chatId);
    setChatHistories(updatedHistories);
    localStorage.setItem('allChatHistories', JSON.stringify(updatedHistories));
    
    if (isDeletingCurrentChat) {
      if (updatedHistories.length > 0) {
        loadChat(updatedHistories[updatedHistories.length - 1].id);
      } else {
        startNewChat();
      }
    }
  };

  const clearAllHistory = () => {
    localStorage.removeItem('allChatHistories');
    setChatHistories([]);
    setMessages([]);
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleImageDelete = () => {
    setImage(null);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !image) return;

    // Menggunakan 'const' karena userMessage tidak diubah setelah deklarasi awal
    const userMessage: Message = { role: 'user' };

    if (input.trim()) {
      userMessage.text = input;
    }

    if (image) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        userMessage.image = reader.result as string;
        setMessages((prev) => [...prev, userMessage]);
        await sendToServer(userMessage);
        setInput('');
        setImage(null);
      };
      reader.readAsDataURL(image);
    } else {
      setMessages((prev) => [...prev, userMessage]);
      await sendToServer(userMessage);
      setInput('');
      setImage(null);
    }
  };

  const sendToServer = async (message: Message) => {
    setIsLoading(true);
    try {
      const body = {
        message: message.text,
        image: message.image,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const aiMessage: Message = { role: 'ai', text: data.text };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: '⚠️ Maaf, terjadi kesalahan.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button 
        className={styles.menuButton} 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        ☰
      </button>

      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.title}>💬 Amigo AI</h1>
          <button onClick={startNewChat} className={styles.newChatButton}>
            ➕ Obrolan Baru
          </button>
        </div>
        <div className={styles.historyList}>
          {chatHistories.map((chat) => (
            <div key={chat.id} className={`${styles.historyItem} ${currentChatId === chat.id ? styles.activeHistoryItem : ''}`}>
              <button onClick={() => loadChat(chat.id)} className={styles.historyItemText}>
                {chat.title}
              </button>
              <button onClick={() => deleteChat(chat.id)} className={styles.deleteHistoryButton}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={clearAllHistory} className={styles.clearAllButton}>
          🗑 Hapus Semua Riwayat
        </button>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.chatWindow}>
          {messages.length === 0 && (
            <p className={styles.emptyMessage}>Mulai percakapan Anda...</p>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${styles.message} ${
                msg.role === 'user' ? styles.userMessage : styles.aiMessage
              }`}
            >
              {msg.text && <p>{msg.text}</p>}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="sent"
                  className={styles.chatImage}
                />
              )}
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <p>Sedang mengetik...</p>
            </div>
          )}
        </div>
        
        {image && (
          <div className={styles.imagePreview}>
            <img src={URL.createObjectURL(image)} alt="Preview" className={styles.chatImage} />
            <button onClick={handleImageDelete} className={styles.deleteImageButton}>
              ✕
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pesan Anda..."
            className={styles.input}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.fileInput}
            id="file-input"
          />
          <label htmlFor="file-input" className={styles.fileInputLabel}>
            Unggah Gambar
          </label>
          <button type="submit" disabled={isLoading || (!input.trim() && !image)} className={styles.button}>
            {isLoading ? '⏳' : 'Kirim'}
          </button>
        </form>
      </div>
    </div>
  );
}